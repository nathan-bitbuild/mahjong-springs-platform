"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/db";
import { auth, signIn, signOut } from "@/auth";
import { assertLeagueLocationAllowed } from "@/lib/utah";
import {
  BOOKING_FEE_CENTS,
  buildDirectChargeCheckout,
  buildEntryFeeRefund,
  checkoutTotalCents,
  feeLedgerForComp,
  integrationIdentifier,
} from "@/lib/fees";
import { requireStripe, stripeOrNull, stripePublishableKey } from "@/lib/stripe-server";
import { slugify, siteUrl } from "@/lib/constants";
import { DEFAULT_SCORING, reconcileEntries, type PlayerEntry, type ScoreOutcome } from "@/lib/scoring";
import { paymentsReady, refreshOrganizationStripe } from "@/server/payments";
import { canOpenStripeDashboard, checkoutSessionIsOpen, compWouldErasePayment, registrationAlreadyPaid, rosterHoldsSeat, SEAT_HOLD_MS } from "@/lib/stripe-flow";
import { zonedLocalToUtc } from "@/lib/time";
import { createHash } from "node:crypto";

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

function stripeFailureMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function safeCallback(value: FormDataEntryValue | null, fallback = "/account/") {
  const raw = String(value ?? "");
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  return raw;
}

async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true },
  });
}

async function requireSessionUser() {
  const user = await currentUser();
  if (!user) redirect("/login/");
  return user;
}

function dollarsToCents(raw: string) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 10000) {
    throw new Error("Enter an entry fee between $0 and $10,000.");
  }
  return Math.round(value * 100);
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Enter a valid date.");
  return new Date(`${value}T00:00:00.000Z`);
}

const STATUSES = ["DRAFT", "UPCOMING", "OPEN", "IN_PLAY", "CLOSED"] as const;
type LeagueStatusName = (typeof STATUSES)[number];

function readLeagueForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const start = parseDate(String(formData.get("startDate") ?? ""));
  const end = parseDate(String(formData.get("endDate") ?? ""));
  if (end < start) throw new Error("The end date has to be on or after the start date.");
  const entryFeeCents = dollarsToCents(String(formData.get("entryFee") ?? "80"));
  const capacity = Math.max(0, Math.round(Number(formData.get("capacity") || 0)));
  const venueCity = String(formData.get("venueCity") ?? "").trim();
  const venueState = String(formData.get("venueState") ?? "").trim().toUpperCase();
  const venueZip = String(formData.get("venueZip") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "DRAFT");
  const status = (STATUSES as readonly string[]).includes(statusRaw) ? (statusRaw as LeagueStatusName) : "DRAFT";
  if (title.length < 3) throw new Error("Give the league a title.");
  if (!venueCity || venueState.length !== 2) throw new Error("Enter a venue city and a two-letter state.");
  return { title, description, start, end, entryFeeCents, capacity, venueCity, venueState, venueZip, status };
}

async function organizerOrg() {
  const user = await requireSessionUser();
  if (user.role !== "ORGANIZER" && user.role !== "ADMIN") redirect("/account/");
  if (!user.organization) throw new Error("This account is not attached to an organization.");
  if (user.organization.status === "SUSPENDED") {
    redirect("/organizer/?error=" + encodeURIComponent("This organization is suspended. Leagues cannot be changed until Mahjong Springs reinstates it."));
  }
  return { user, org: user.organization };
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = safeCallback(formData.get("callbackUrl"));
  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login/?error=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw error;
  }
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}

export async function signup(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const asOrganizer = formData.get("asOrganizer") === "1";
  const orgName = String(formData.get("orgName") ?? "").trim();
  if (name.length < 2 || name.length > 80) throw new Error("Enter the name you want on the table.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email.");
  if (password.length < 8) throw new Error("Use at least 8 characters for the password.");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/login/?error=exists");
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: asOrganizer ? "ORGANIZER" : "PLAYER",
    },
  });
  if (asOrganizer) {
    const label = orgName || `${name}'s league`;
    const org = await prisma.organization.create({
      data: {
        name: label,
        slug: `${slugify(label)}-${user.id.slice(-6)}`,
        status: "PENDING",
        isHome: false,
        ownerId: user.id,
      },
    });
    await prisma.user.update({ where: { id: user.id }, data: { organizationId: org.id } });
  }
  await signIn("credentials", { email, password, redirectTo: asOrganizer ? "/organizer/" : "/account/" });
}

export async function saveProfile(formData: FormData) {
  const user = await requireSessionUser();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      displayName: String(formData.get("displayName") ?? "").trim().slice(0, 80),
      skill: String(formData.get("skill") ?? "social"),
      partOfTown: String(formData.get("partOfTown") ?? "").trim().slice(0, 80),
      phone: String(formData.get("phone") ?? "").trim().slice(0, 40),
      sharePhone: formData.get("sharePhone") === "1",
      emailReminders: formData.get("emailReminders") === "1",
      emailHostUpdates: formData.get("emailHostUpdates") === "1",
      emailScores: formData.get("emailScores") === "1",
    },
  });
  redirect("/my-profile/?saved=1");
}

export async function subscribeNewsletter(formData: FormData) {
  const redirectTo = safeCallback(formData.get("redirect"), "/");
  if (String(formData.get("company_website") ?? "").trim()) redirect(redirectTo);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}news=invalid`);
  }
  const ipHash = createHash("sha256").update(email).digest("hex").slice(0, 16);
  try {
    await prisma.newsletterSubscriber.create({ data: { email, source: "homepage", ipHash } });
  } catch {
    redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}news=exists`);
  }
  redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}news=ok`);
}

export async function saveLeague(formData: FormData) {
  const { org } = await organizerOrg();
  const existingId = String(formData.get("leagueId") ?? "");
  const existing = existingId
    ? await prisma.league.findFirst({ where: { id: existingId, organizationId: org.id } })
    : null;
  if (existingId && !existing) throw new Error("League not found.");
  let fields;
  try {
    fields = readLeagueForm(formData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Check the form.";
    const back = existing ? `/organizer/leagues/${existing.id}/` : "/organizer/leagues/new/";
    redirect(`${back}?error=${encodeURIComponent(message)}`);
  }
  const intent = existing ? "edit" : "create";
  try {
    assertLeagueLocationAllowed({
      intent,
      isHomeOrg: org.isHome,
      state: fields.venueState,
      zip: fields.venueZip,
    });
    if (fields.status !== "DRAFT") {
      assertLeagueLocationAllowed({
        intent: "publish",
        isHomeOrg: org.isHome,
        state: fields.venueState,
        zip: fields.venueZip,
      });
      if (org.status !== "APPROVED") {
        throw new Error("New organizers wait for approval before a league can be public.");
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "This league cannot be saved.";
    const back = existing ? `/organizer/leagues/${existing.id}/` : "/organizer/leagues/new/";
    redirect(`${back}?error=${encodeURIComponent(message)}`);
  }

  const base = slugify(fields.title);
  let slug = existing?.slug ?? base;
  if (!existing) {
    slug = base;
    const clash = await prisma.league.findUnique({ where: { slug } });
    if (clash) slug = `${base}-${Date.now().toString(36)}`;
  }
  const data = {
    title: fields.title,
    description: fields.description,
    startDate: fields.start,
    endDate: fields.end,
    entryFeeCents: fields.entryFeeCents,
    capacity: fields.capacity,
    venueCity: fields.venueCity,
    venueState: fields.venueState,
    venueZip: fields.venueZip,
    status: fields.status,
    slug,
  };
  const league = existing
    ? await prisma.league.update({ where: { id: existing.id }, data })
    : await prisma.league.create({ data: { ...data, organizationId: org.id } });
  redirect(`/organizer/leagues/${league.id}/?saved=1`);
}

export async function compEntry(formData: FormData) {
  const { org, user } = await organizerOrg();
  const league = await prisma.league.findFirst({ where: { id: String(formData.get("leagueId")), organizationId: org.id } });
  if (!league) throw new Error("League not found.");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const player = await prisma.user.findUnique({ where: { email } });
  if (!player) redirect(`/organizer/leagues/${league.id}/?error=${encodeURIComponent("No account uses that email yet.")}`);
  const already = await prisma.roster.findUnique({ where: { leagueId_userId: { leagueId: league.id, userId: player.id } } });
  if (already && compWouldErasePayment(already.paymentStatus)) {
    redirect(`/organizer/leagues/${league.id}/?error=${encodeURIComponent("This player already has a payment in progress or on file. Refund it before adding a comp.")}`);
  }
  const ledger = feeLedgerForComp(league.entryFeeCents);
  await prisma.roster.upsert({
    where: { leagueId_userId: { leagueId: league.id, userId: player.id } },
    create: {
      leagueId: league.id,
      userId: player.id,
      status: "ACTIVE",
      source: "COMP",
      paymentStatus: "COMP",
      entryFeeCents: ledger.entryFeeCents,
      bookingFeeCents: 0,
      totalCents: 0,
    },
    update: { status: "ACTIVE", source: "COMP", paymentStatus: "COMP" },
  });
  await prisma.adjustment.create({
    data: { leagueId: league.id, userId: player.id, points: 0, note: `Comp entry by ${user.name}`, createdById: user.id },
  });
  redirect(`/organizer/leagues/${league.id}/?saved=1`);
}

export async function refundEntry(formData: FormData) {
  const { org } = await organizerOrg();
  const roster = await prisma.roster.findFirst({
    where: { id: String(formData.get("rosterId")), league: { organizationId: org.id } },
    include: { league: true, ledger: true },
  });
  if (!roster || roster.paymentStatus !== "PAID" || !roster.stripePaymentIntentId || !org.stripeAccountId) {
    redirect(`/organizer/leagues/${roster?.leagueId ?? ""}/?error=${encodeURIComponent("Only a paid Stripe registration can be refunded here.")}`);
  }
  const stripe = requireStripe();
  const built = buildEntryFeeRefund({
    paymentIntentId: roster.stripePaymentIntentId,
    entryFeeCents: roster.entryFeeCents,
    stripeAccountId: org.stripeAccountId,
    rosterId: roster.id,
  });
  try {
    await stripe.refunds.create(built.params, built.options);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirect(
      `/organizer/leagues/${roster.leagueId}/?error=${encodeURIComponent(stripeFailureMessage(error, "Stripe could not refund this entry fee."))}`,
    );
  }
  await prisma.$transaction([
    ...(roster.ledger
      ? [prisma.feeLedgerEntry.update({ where: { id: roster.ledger.id }, data: { refundedEntryCents: roster.entryFeeCents } })]
      : []),
    prisma.roster.update({
      where: { id: roster.id },
      data: { paymentStatus: "REFUNDED", status: "REFUNDED" },
    }),
  ]);
  redirect(`/organizer/leagues/${roster.leagueId}/?saved=1`);
}

export async function startStripeOnboarding() {
  const { org } = await organizerOrg();
  const stripe = requireStripe();
  let accountId = org.stripeAccountId;
  if (!accountId) {
    const account = await stripe.v2.core.accounts.create({
      display_name: org.name,
      contact_email: (await prisma.user.findUnique({ where: { id: org.ownerId } }))?.email,
      dashboard: "full",
      identity: { country: "us" },
      defaults: {
        responsibilities: { fees_collector: "stripe", losses_collector: "stripe" },
      },
      configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
      metadata: { organizationId: org.id },
    });
    accountId = account.id;
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeAccountId: accountId, cardPaymentsStatus: "pending" },
    });
  }
  const origin = siteUrl();
  const link = await stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        refresh_url: `${origin}/organizer/stripe/refresh/`,
        return_url: `${origin}/organizer/stripe/return/`,
      },
    },
  });
  redirect(link.url);
}

export async function openStripeDashboard() {
  const { org } = await organizerOrg();
  if (!org.stripeAccountId || !canOpenStripeDashboard(org.cardPaymentsStatus)) {
    redirect(`/organizer/?error=${encodeURIComponent("Finish Stripe onboarding before opening the dashboard. Card payments are not active yet.")}`);
  }
  const stripe = requireStripe();
  const origin = siteUrl();
  try {
    const link = await stripe.v2.core.accountLinks.create({
      account: org.stripeAccountId,
      use_case: {
        type: "account_dashboard",
        account_dashboard: { refresh_url: `${origin}/organizer/stripe/refresh/` },
      },
    });
    redirect(link.url);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirect(`/organizer/?error=${encodeURIComponent(stripeFailureMessage(error, "Stripe could not open the dashboard."))}`);
  }
}

export async function beginCheckout(formData: FormData) {
  const user = await requireSessionUser();
  const league = await prisma.league.findUnique({
    where: { slug: String(formData.get("slug") ?? "") },
    include: { organization: true },
  });
  if (!league || !["OPEN", "IN_PLAY"].includes(league.status) || league.organization.status !== "APPROVED") {
    redirect("/leagues/?error=signup");
  }
  if (!paymentsReady(league.organization.cardPaymentsStatus) || !league.organization.stripeAccountId) {
    redirect(`/league/${league.slug}/?error=${encodeURIComponent("This organizer has not finished Stripe setup, so checkout is not open.")}`);
  }
  if (!stripePublishableKey() || !stripeOrNull()) {
    redirect(
      `/league/${league.slug}/checkout/?error=${encodeURIComponent("Stripe checkout is not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to a pk_test_ key and STRIPE_SECRET_KEY to an rk_test_ or sk_test_ key. No Checkout Session was created.")}`,
    );
  }
  const existing = await prisma.roster.findUnique({ where: { leagueId_userId: { leagueId: league.id, userId: user.id } } });
  if (existing && registrationAlreadyPaid(existing.paymentStatus)) {
    redirect(`/league/${league.slug}/?saved=1`);
  }
  const stripe = requireStripe();
  if (existing?.stripeCheckoutSessionId) {
    try {
      const current = await stripe.checkout.sessions.retrieve(
        existing.stripeCheckoutSessionId,
        {},
        { stripeAccount: league.organization.stripeAccountId },
      );
      if (checkoutSessionIsOpen(current.status)) {
        redirect(`/league/${league.slug}/checkout/`);
      }
    } catch (error) {
      if (isNextRedirect(error)) throw error;
    }
  }
  const now = new Date();
  const holdSince = new Date(now.getTime() - SEAT_HOLD_MS);
  const keepsHold = existing ? rosterHoldsSeat(existing, now) && existing.status === "PENDING_PAYMENT" : false;
  let roster;
  try {
    const reserved = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "League" WHERE id = ${league.id} FOR UPDATE`;
      if (league.capacity > 0) {
        const taken = await tx.roster.count({
          where: {
            leagueId: league.id,
            ...(existing ? { id: { not: existing.id } } : {}),
            OR: [
              { status: "ACTIVE" },
              { status: "PENDING_PAYMENT", updatedAt: { gte: holdSince } },
            ],
          },
        });
        if (taken >= league.capacity && !keepsHold) {
          await tx.roster.upsert({
            where: { leagueId_userId: { leagueId: league.id, userId: user.id } },
            create: {
              leagueId: league.id,
              userId: user.id,
              status: "WAITLIST",
              source: "FREE",
              paymentStatus: "UNPAID",
              entryFeeCents: league.entryFeeCents,
            },
            update: { status: "WAITLIST", paymentStatus: "UNPAID" },
          });
          return null;
        }
      }
      if (existing) {
        return tx.roster.update({
          where: { id: existing.id },
          data: {
            status: "PENDING_PAYMENT",
            paymentStatus: "PENDING",
            entryFeeCents: league.entryFeeCents,
            bookingFeeCents: BOOKING_FEE_CENTS,
            totalCents: checkoutTotalCents(league.entryFeeCents),
            checkoutIntegrationId: existing.checkoutIntegrationId ?? integrationIdentifier(),
          },
        });
      }
      return tx.roster.create({
        data: {
          leagueId: league.id,
          userId: user.id,
          status: "PENDING_PAYMENT",
          paymentStatus: "PENDING",
          source: "ORDER",
          entryFeeCents: league.entryFeeCents,
          bookingFeeCents: BOOKING_FEE_CENTS,
          totalCents: checkoutTotalCents(league.entryFeeCents),
          checkoutIntegrationId: integrationIdentifier(),
          isTestData: league.isTestData,
        },
      });
    });
    if (!reserved) redirect(`/league/${league.slug}/?waitlist=1`);
    roster = reserved;
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code !== "P2002") throw error;
    const raced = await prisma.roster.findUnique({ where: { leagueId_userId: { leagueId: league.id, userId: user.id } } });
    if (!raced || registrationAlreadyPaid(raced.paymentStatus)) redirect(`/league/${league.slug}/?saved=1`);
    roster = raced;
  }
  const attempt = roster.checkoutAttempt + 1;
  const built = buildDirectChargeCheckout({
    leagueTitle: league.title,
    entryFeeCents: league.entryFeeCents,
    rosterId: roster.id,
    leagueId: league.id,
    userId: user.id,
    stripeAccountId: league.organization.stripeAccountId,
    returnUrl: `${siteUrl()}/league/${league.slug}/checkout/return/?session_id={CHECKOUT_SESSION_ID}`,
    customerEmail: user.email,
    integrationIdentifier: roster.checkoutIntegrationId || integrationIdentifier(),
  });
  const session = await stripe.checkout.sessions.create(built.params, {
    stripeAccount: built.options.stripeAccount,
    idempotencyKey: `roster_${roster.id}_checkout_${attempt}`,
  });
  await prisma.roster.update({
    where: { id: roster.id },
    data: { stripeCheckoutSessionId: session.id, checkoutAttempt: attempt },
  });
  redirect(`/league/${league.slug}/checkout/`);
}

export async function saveGame(formData: FormData) {
  const user = await requireSessionUser();
  const leagueId = String(formData.get("leagueId") ?? "");
  const roster = await prisma.roster.findUnique({ where: { leagueId_userId: { leagueId, userId: user.id } } });
  const league = await prisma.league.findUnique({ where: { id: leagueId }, include: { organization: true } });
  if (!league || !roster || roster.status !== "ACTIVE" || !["OPEN", "IN_PLAY"].includes(league.status)) {
    redirect("/host-a-game/?error=roster");
  }
  const partOfTown = String(formData.get("partOfTown") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const local = String(formData.get("startAt") ?? "");
  const timeZone = String(formData.get("timeZone") ?? "America/Denver");
  if (!partOfTown || !address) redirect("/host-a-game/?error=address");
  const startAt = zonedLocalToUtc(local, timeZone);
  const tablesCount = Math.min(6, Math.max(1, Number(formData.get("tablesCount") || 1)));
  const game = await prisma.game.create({
    data: {
      leagueId: league.id,
      hostId: user.id,
      startAt,
      timeZone,
      venue: String(formData.get("venue") ?? "").trim(),
      address,
      city: String(formData.get("city") ?? league.venueCity).trim(),
      state: String(formData.get("state") ?? league.venueState).trim().toUpperCase(),
      zip: String(formData.get("zip") ?? league.venueZip).trim(),
      partOfTown,
      roundType: String(formData.get("roundType") ?? "standard"),
      notes: String(formData.get("notes") ?? "").trim(),
      tablesCount,
      isTestData: league.isTestData,
    },
  });
  await prisma.attendee.create({ data: { gameId: game.id, userId: user.id, tableNo: 1, source: "host" } });
  const invites = String(formData.get("invites") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
  for (const email of invites) {
    const player = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!player) continue;
    const onRoster = await prisma.roster.findUnique({ where: { leagueId_userId: { leagueId: league.id, userId: player.id } } });
    if (!onRoster || onRoster.status !== "ACTIVE" || player.id === user.id) continue;
    const taken = await prisma.attendee.count({ where: { gameId: game.id } });
    if (taken >= tablesCount * 4) break;
    const tableNo = Math.floor(taken / 4) + 1;
    await prisma.attendee.create({ data: { gameId: game.id, userId: player.id, tableNo, source: "invite" } }).catch(() => undefined);
  }
  redirect(`/games/${game.id}/`);
}

export async function joinGame(formData: FormData) {
  const user = await requireSessionUser();
  const game = await prisma.game.findUnique({ where: { id: String(formData.get("gameId")) }, include: { attendees: true, league: true } });
  if (!game || game.status !== "SCHEDULED" || game.startAt < new Date()) redirect("/find-a-table/?error=closed");
  const roster = await prisma.roster.findUnique({ where: { leagueId_userId: { leagueId: game.leagueId, userId: user.id } } });
  if (!roster || roster.status !== "ACTIVE") redirect(`/league/${game.league.slug}/?error=roster`);
  const cap = game.tablesCount * 4;
  const joined = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Game" WHERE id = ${game.id} FOR UPDATE`;
    const attendees = await tx.attendee.findMany({ where: { gameId: game.id } });
    if (attendees.some((attendee) => attendee.userId === user.id)) return "already" as const;
    if (attendees.length >= cap) return "full" as const;
    const counts = new Map<number, number>();
    for (const attendee of attendees) counts.set(attendee.tableNo, (counts.get(attendee.tableNo) ?? 0) + 1);
    let tableNo = 1;
    for (let i = 1; i <= game.tablesCount; i += 1) {
      if ((counts.get(i) ?? 0) < 4) {
        tableNo = i;
        break;
      }
    }
    await tx.attendee.create({ data: { gameId: game.id, userId: user.id, tableNo, source: "self" } });
    return "joined" as const;
  });
  if (joined === "full") redirect(`/games/${game.id}/?error=full`);
  redirect(`/games/${game.id}/?joined=1`);
}

export async function leaveGame(formData: FormData) {
  const user = await requireSessionUser();
  const gameId = String(formData.get("gameId") ?? "");
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game || game.hostId === user.id) redirect(`/games/${gameId}/`);
  await prisma.attendee.deleteMany({ where: { gameId, userId: user.id } });
  redirect("/find-a-table/");
}

export async function saveScores(formData: FormData) {
  const user = await requireSessionUser();
  const game = await prisma.game.findUnique({
    where: { id: String(formData.get("gameId")) },
    include: { attendees: true, league: { include: { organization: true } }, host: true },
  });
  if (!game) redirect("/my-league/");
  const tableNo = Number(formData.get("tableNo") || 1);
  const seated = game.attendees.filter((a) => a.tableNo === tableNo).map((a) => a.userId);
  const isManager = user.role === "ADMIN" || (user.role === "ORGANIZER" && user.organizationId === game.league.organizationId);
  const isHost = game.hostId === user.id;
  if (!isHost && !isManager && !seated.includes(user.id)) redirect(`/games/${game.id}/`);
  let sheet = await prisma.scoreSheet.findUnique({ where: { gameId_tableNo: { gameId: game.id, tableNo } } });
  if (!sheet) {
    sheet = await prisma.scoreSheet.create({ data: { gameId: game.id, tableNo, status: "OPEN" } });
  }
  if (sheet.status === "CONFIRMED" && !isManager) redirect(`/games/${game.id}/score/?error=locked`);
  const target = isHost || isManager ? String(formData.get("playerId") || user.id) : user.id;
  if (!seated.includes(target)) redirect(`/games/${game.id}/score/?error=player`);
  for (let hand = 1; hand <= DEFAULT_SCORING.gamesPerSession; hand += 1) {
    const outcome = String(formData.get(`outcome_${hand}`) ?? "") as ScoreOutcome;
    await prisma.scoreEntry.upsert({
      where: { sheetId_userId_handNo: { sheetId: sheet.id, userId: target, handNo: hand } },
      create: {
        sheetId: sheet.id,
        userId: target,
        handNo: hand,
        outcome,
        handValue: Number(formData.get(`value_${hand}`) || 0),
        selfPicked: formData.get(`self_${hand}`) === "1",
        jokerless: formData.get(`joker_${hand}`) === "1",
        threw: formData.get(`threw_${hand}`) === "1",
        dead: formData.get(`dead_${hand}`) === "1",
      },
      update: {
        outcome,
        handValue: Number(formData.get(`value_${hand}`) || 0),
        selfPicked: formData.get(`self_${hand}`) === "1",
        jokerless: formData.get(`joker_${hand}`) === "1",
        threw: formData.get(`threw_${hand}`) === "1",
        dead: formData.get(`dead_${hand}`) === "1",
      },
    });
  }
  const entries = await prisma.scoreEntry.findMany({ where: { sheetId: sheet.id } });
  const names = Object.fromEntries(
    (await prisma.user.findMany({ where: { id: { in: seated } } })).map((person) => [person.id, person.displayName || person.name]),
  );
  const mapped: PlayerEntry[] = entries.map((entry) => ({
    userId: entry.userId,
    handNo: entry.handNo,
    outcome: entry.outcome as ScoreOutcome,
    handValue: entry.handValue,
    selfPicked: entry.selfPicked,
    jokerless: entry.jokerless,
    threw: entry.threw,
    dead: entry.dead,
  }));
  const noshows = (sheet.noshows && typeof sheet.noshows === "object" ? sheet.noshows : {}) as Record<string, boolean>;
  const result = reconcileEntries(seated, noshows, mapped, names);
  await prisma.officialHand.deleteMany({ where: { sheetId: sheet.id } });
  if (!result.ok) {
    await prisma.scoreSheet.update({ where: { id: sheet.id }, data: { status: "OPEN", confirmedById: null, confirmedAt: null } });
    redirect(`/games/${game.id}/score/?saved=1`);
  }
  await prisma.officialHand.createMany({
    data: result.hands.map((hand) => ({
      sheetId: sheet.id,
      handNo: hand.handNo,
      winnerId: hand.winnerId,
      handValue: hand.handValue,
      selfPicked: hand.selfPicked,
      jokerless: hand.jokerless,
      discarderId: hand.discarderId,
      deadHands: hand.deadHands.join(","),
    })),
  });
  const wantsConfirm = formData.get("confirm") === "1";
  const present = seated.filter((id) => !(id in noshows));
  const mayConfirm = wantsConfirm && (isManager || isHost || present.includes(user.id));
  await prisma.scoreSheet.update({
    where: { id: sheet.id },
    data: mayConfirm
      ? { status: "CONFIRMED", confirmedById: user.id, confirmedAt: new Date() }
      : { status: "PENDING", confirmedById: null, confirmedAt: null },
  });
  redirect(`/games/${game.id}/score/?saved=1`);
}

export async function confirmSheet(formData: FormData) {
  const user = await requireSessionUser();
  const sheet = await prisma.scoreSheet.findUnique({
    where: { id: String(formData.get("sheetId")) },
    include: { game: { include: { attendees: true, league: true } } },
  });
  if (!sheet || sheet.status !== "PENDING") redirect("/my-league/");
  const seated = sheet.game.attendees.filter((a) => a.tableNo === sheet.tableNo).map((a) => a.userId);
  const isHost = sheet.game.hostId === user.id;
  const managesLeague = user.role === "ADMIN" || (user.role === "ORGANIZER" && user.organizationId === sheet.game.league.organizationId);
  if (!isHost && !managesLeague && !seated.includes(user.id)) redirect(`/games/${sheet.gameId}/`);
  await prisma.scoreSheet.update({
    where: { id: sheet.id },
    data: { status: "CONFIRMED", confirmedById: user.id, confirmedAt: new Date() },
  });
  redirect(`/games/${sheet.gameId}/?confirmed=1`);
}

export async function requestCorrection(formData: FormData) {
  const user = await requireSessionUser();
  const gameId = String(formData.get("gameId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { attendees: true, league: true },
  });
  const sheet = game
    ? await prisma.scoreSheet.findFirst({ where: { gameId, tableNo: Number(formData.get("tableNo") || 1) } })
    : null;
  const seated = game?.attendees.some((attendee) => attendee.userId === user.id) ?? false;
  const manages = user.role === "ADMIN" || (user.role === "ORGANIZER" && user.organizationId === game?.league.organizationId);
  if (!game || !sheet || note.length < 3 || (!seated && game.hostId !== user.id && !manages)) redirect(`/games/${gameId}/`);
  await prisma.correction.create({ data: { sheetId: sheet.id, gameId, userId: user.id, note } });
  redirect(`/games/${gameId}/?correction=1`);
}

export async function setOrganizerStatus(formData: FormData) {
  const user = await requireSessionUser();
  if (user.role !== "ADMIN") redirect("/");
  const status = String(formData.get("status") ?? "");
  if (status !== "APPROVED" && status !== "SUSPENDED" && status !== "PENDING") return;
  const org = await prisma.organization.findUnique({ where: { id: String(formData.get("organizationId")) } });
  if (!org || org.isHome) redirect("/admin/?error=home");
  await prisma.organization.update({ where: { id: org.id }, data: { status } });
  if (status !== "APPROVED") {
    await prisma.league.updateMany({ where: { organizationId: org.id, status: { not: "DRAFT" } }, data: { status: "DRAFT" } });
  }
  redirect("/admin/?saved=1");
}

export async function syncStripeReturn() {
  const { org } = await organizerOrg();
  try {
    await refreshOrganizationStripe(org.id);
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    redirect(`/organizer/?error=${encodeURIComponent(stripeFailureMessage(error, "Could not refresh Stripe status."))}`);
  }
  redirect("/organizer/?stripe=1");
}
