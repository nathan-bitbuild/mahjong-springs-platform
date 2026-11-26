import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { BOOKING_FEE_CENTS, cardPaymentsActive, feeLedgerForPayment } from "@/lib/fees";
import { requireStripe, stripeOrNull } from "@/lib/stripe-server";
import {
  accountIdFromSnapshotEvent,
  accountIdFromThinNotification,
  detailsSubmittedFromAccount,
  isThinEventPayload,
  paymentStatusAfterDispute,
} from "@/lib/stripe-flow";

export async function refreshOrganizationStripe(organizationId: string) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org?.stripeAccountId) return org;
  const stripe = stripeOrNull();
  if (!stripe) return org;
  const account = await stripe.v2.core.accounts.retrieve(org.stripeAccountId, {
    include: ["configuration.merchant", "requirements"],
  });
  const status = account.configuration?.merchant?.capabilities?.card_payments?.status ?? "inactive";
  const entries = account.requirements?.entries ?? [];
  return prisma.organization.update({
    where: { id: org.id },
    data: {
      cardPaymentsStatus: status,
      detailsSubmitted: detailsSubmittedFromAccount({
        cardPaymentsStatus: status,
        summaryStatus: account.requirements?.summary?.minimum_deadline?.status,
        entryStatuses: entries.map((entry) => entry.minimum_deadline?.status),
        requirementsKnown: Boolean(account.requirements),
      }),
    },
  });
}

export function paymentsReady(status: string | null | undefined): boolean {
  return cardPaymentsActive({
    configuration: { merchant: { capabilities: { card_payments: { status: status ?? "" } } } },
  });
}

export async function fulfillPaidSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return;
  const rosterId = session.metadata?.rosterId || session.client_reference_id;
  if (!rosterId) return;
  const roster = await prisma.roster.findUnique({ where: { id: rosterId }, include: { league: true } });
  if (!roster || roster.paymentStatus === "PAID" || roster.paymentStatus === "COMP") return;

  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const ledger = feeLedgerForPayment(roster.entryFeeCents);

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "League" WHERE id = ${roster.leagueId} FOR UPDATE`;
    const current = await tx.roster.findUnique({ where: { id: roster.id } });
    if (!current || current.paymentStatus === "PAID" || current.paymentStatus === "COMP") return;
    const activeCount = await tx.roster.count({
      where: { leagueId: roster.leagueId, status: "ACTIVE" },
    });
    const cap = roster.league.capacity;
    const waitlisted = cap > 0 && activeCount >= cap;
    await tx.roster.update({
      where: { id: roster.id },
      data: {
        status: waitlisted ? "WAITLIST" : "ACTIVE",
        paymentStatus: "PAID",
        source: "ORDER",
        bookingFeeCents: BOOKING_FEE_CENTS,
        totalCents: ledger.grossCents,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId ?? roster.stripePaymentIntentId,
      },
    });
    await tx.feeLedgerEntry.upsert({
      where: { rosterId: roster.id },
      create: {
        rosterId: roster.id,
        organizationId: roster.league.organizationId,
        grossCents: ledger.grossCents,
        entryFeeCents: ledger.entryFeeCents,
        platformFeeCents: ledger.platformFeeCents,
        isTestData: roster.isTestData,
      },
      update: {
        grossCents: ledger.grossCents,
        platformFeeCents: ledger.platformFeeCents,
      },
    });
  });
}

export async function markSessionFailed(session: Stripe.Checkout.Session) {
  const rosterId = session.metadata?.rosterId || session.client_reference_id;
  if (!rosterId) return;
  await prisma.roster.updateMany({
    where: { id: rosterId, paymentStatus: "PENDING" },
    data: { paymentStatus: "FAILED", status: "REMOVED" },
  });
}

export async function recordRefund(input: { paymentIntentId?: string | null; chargeId?: string | null; amountRefunded: number }) {
  const roster = await prisma.roster.findFirst({
    where: {
      OR: [
        input.paymentIntentId ? { stripePaymentIntentId: input.paymentIntentId } : undefined,
        input.chargeId ? { stripeChargeId: input.chargeId } : undefined,
      ].filter(Boolean) as { stripePaymentIntentId: string }[],
    },
    include: { ledger: true },
  });
  if (!roster?.ledger) return;
  const refundedEntry = Math.min(roster.entryFeeCents, input.amountRefunded);
  const fully = refundedEntry >= roster.entryFeeCents;
  await prisma.feeLedgerEntry.update({
    where: { id: roster.ledger.id },
    data: { refundedEntryCents: refundedEntry },
  });
  if (fully) {
    await prisma.roster.update({
      where: { id: roster.id },
      data: { paymentStatus: "REFUNDED", status: "REFUNDED" },
    });
  }
}

export async function recordDispute(paymentIntentId: string | null, status: "OPEN" | "WON" | "LOST") {
  if (!paymentIntentId) return;
  const roster = await prisma.roster.findFirst({ where: { stripePaymentIntentId: paymentIntentId }, include: { ledger: true } });
  if (!roster?.ledger) return;
  await prisma.$transaction([
    prisma.feeLedgerEntry.update({ where: { id: roster.ledger.id }, data: { disputeStatus: status } }),
    prisma.roster.update({
      where: { id: roster.id },
      data: { paymentStatus: paymentStatusAfterDispute(status, roster.paymentStatus) as "PAID" | "DISPUTED" | "REFUNDED" },
    }),
  ]);
}

export async function constructWebhookEvent(payload: string, signature: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  if (!signature) throw new Error("Missing Stripe-Signature header.");
  const stripe = requireStripe();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

function thinWebhookSecret(): string {
  return process.env.STRIPE_THIN_WEBHOOK_SECRET?.trim() || "";
}

export function parseThinEventNotification(payload: string, signature: string | null) {
  const secret = thinWebhookSecret();
  if (!secret) throw new Error("STRIPE_THIN_WEBHOOK_SECRET is not set.");
  if (!signature) throw new Error("Missing Stripe-Signature header.");
  const stripe = requireStripe();
  return stripe.parseEventNotification(payload, signature, secret);
}

async function claimStripeEvent(id: string, type: string): Promise<boolean> {
  try {
    await prisma.stripeEvent.create({ data: { id, type } });
    return true;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "P2002") return false;
    throw error;
  }
}

async function releaseStripeEvent(id: string) {
  await prisma.stripeEvent.delete({ where: { id } }).catch(() => undefined);
}

export async function handleThinNotification(notification: {
  id: string;
  type: string;
  related_object?: { id?: string } | { url?: string } | null;
}) {
  if (!(await claimStripeEvent(notification.id, notification.type))) return;
  try {
    const accountId = accountIdFromThinNotification(notification);
    if (!accountId) return;
    const org = await prisma.organization.findUnique({ where: { stripeAccountId: accountId } });
    if (org) await refreshOrganizationStripe(org.id);
  } catch (error) {
    await releaseStripeEvent(notification.id);
    throw error;
  }
}

/** Route a raw webhook body to the snapshot parser or the v2 thin-event parser. */
export async function receiveStripeWebhook(payload: string, signature: string | null) {
  if (isThinEventPayload(payload)) {
    const notification = parseThinEventNotification(payload, signature);
    await handleThinNotification(notification);
    return { kind: "thin" as const };
  }
  const event = await constructWebhookEvent(payload, signature);
  await handleStripeEvent(event);
  return { kind: "snapshot" as const };
}

export async function handleStripeEvent(event: Stripe.Event) {
  if (!(await claimStripeEvent(event.id, event.type))) return;
  try {
    await applyStripeEvent(event);
  } catch (error) {
    await releaseStripeEvent(event.id);
    throw error;
  }
}

async function applyStripeEvent(event: Stripe.Event) {
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") await fulfillPaidSession(session);
    return;
  }
  if (event.type === "checkout.session.async_payment_failed") {
    await markSessionFailed(event.data.object as Stripe.Checkout.Session);
    return;
  }
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    await recordRefund({ paymentIntentId, chargeId: charge.id, amountRefunded: charge.amount_refunded });
    return;
  }
  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute;
    const paymentIntentId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id ?? null;
    await recordDispute(paymentIntentId, "OPEN");
    return;
  }
  if (event.type === "charge.dispute.closed") {
    const dispute = event.data.object as Stripe.Dispute;
    const paymentIntentId = typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id ?? null;
    await recordDispute(paymentIntentId, dispute.status === "won" ? "WON" : "LOST");
    return;
  }
  const accountId = accountIdFromSnapshotEvent(event);
  if (accountId) {
    const org = await prisma.organization.findUnique({ where: { stripeAccountId: accountId } });
    if (org) await refreshOrganizationStripe(org.id);
  }
}
