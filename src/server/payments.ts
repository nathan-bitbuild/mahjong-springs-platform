import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { BOOKING_FEE_CENTS, cardPaymentsActive, feeLedgerForPayment } from "@/lib/fees";
import { requireStripe, stripeOrNull } from "@/lib/stripe-server";

export async function refreshOrganizationStripe(organizationId: string) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org?.stripeAccountId) return org;
  const stripe = stripeOrNull();
  if (!stripe) return org;
  const account = await stripe.v2.core.accounts.retrieve(org.stripeAccountId, {
    include: ["configuration.merchant"],
  });
  const status = account.configuration?.merchant?.capabilities?.card_payments?.status ?? "inactive";
  return prisma.organization.update({
    where: { id: org.id },
    data: {
      cardPaymentsStatus: status,
      detailsSubmitted: status === "active" || status === "pending" || status === "restricted",
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

  const activeCount = await prisma.roster.count({
    where: { leagueId: roster.leagueId, status: "ACTIVE" },
  });
  const cap = roster.league.capacity;
  const waitlisted = cap > 0 && activeCount >= cap;
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const ledger = feeLedgerForPayment(roster.entryFeeCents);

  await prisma.$transaction(async (tx) => {
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
  await prisma.feeLedgerEntry.update({ where: { id: roster.ledger.id }, data: { disputeStatus: status } });
  if (status === "OPEN") {
    await prisma.roster.update({ where: { id: roster.id }, data: { paymentStatus: "DISPUTED" } });
  }
}

export async function constructWebhookEvent(payload: string, signature: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  if (!signature) throw new Error("Missing Stripe-Signature header.");
  const stripe = requireStripe();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

export async function handleStripeEvent(event: Stripe.Event) {
  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "P2002") return;
    throw error;
  }

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
  if (event.type === "account.updated" || event.type.startsWith("v2.core.account")) {
    const accountId = event.account;
    if (!accountId) return;
    const org = await prisma.organization.findUnique({ where: { stripeAccountId: accountId } });
    if (org) await refreshOrganizationStripe(org.id);
  }
}
