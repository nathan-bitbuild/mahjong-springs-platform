/**
 * Pure Stripe webhook and onboarding decisions. No network calls.
 * Snapshot events are v1 objects (`object: "event"`). Thin events are
 * Accounts v2 notifications (`object: "v2.core.event"`) and carry the
 * connected account on related_object.id, not event.account.
 */

export function isThinEventPayload(payload: string): boolean {
  try {
    const body = JSON.parse(payload) as { object?: unknown };
    return body.object === "v2.core.event";
  } catch {
    return false;
  }
}

export function accountIdFromThinNotification(notification: {
  type: string;
  related_object?: { id?: string } | { url?: string } | null;
}): string | null {
  if (!notification.type.startsWith("v2.core.account")) return null;
  const related = notification.related_object;
  if (related && "id" in related && related.id) return related.id;
  return null;
}

export function accountIdFromSnapshotEvent(event: { type: string; account?: string | null }): string | null {
  if (event.type === "account.updated") return event.account || null;
  return null;
}

export type RequirementDeadline = "currently_due" | "eventually_due" | "past_due" | string;

/**
 * Onboarding is complete when card payments are active, or when Stripe has
 * no currently_due or past_due requirements. A brand-new v2 account is
 * restricted with requirements_past_due, so that is not "details submitted".
 */
export function detailsSubmittedFromAccount(input: {
  cardPaymentsStatus?: string | null;
  summaryStatus?: RequirementDeadline | null;
  entryStatuses?: Array<RequirementDeadline | null | undefined>;
  requirementsKnown: boolean;
}): boolean {
  if (input.cardPaymentsStatus === "active") return true;
  if (!input.requirementsKnown) return false;
  const statuses = [input.summaryStatus, ...(input.entryStatuses ?? [])];
  return !statuses.some((status) => status === "past_due" || status === "currently_due");
}

export function checkoutSessionIsOpen(status: string | null | undefined): boolean {
  return status === "open";
}

export function registrationAlreadyPaid(paymentStatus: string | null | undefined): boolean {
  return paymentStatus === "PAID" || paymentStatus === "COMP";
}

export function canOpenStripeDashboard(cardPaymentsStatus: string | null | undefined): boolean {
  return cardPaymentsStatus === "active";
}

export const SEAT_HOLD_MS = 30 * 60 * 1000;

/** Active roster rows hold a seat. A checkout hold expires so an abandoned session cannot block the league. */
export function rosterHoldsSeat(row: { status: string; updatedAt: Date }, now: Date, holdMs = SEAT_HOLD_MS): boolean {
  if (row.status === "ACTIVE") return true;
  if (row.status === "PENDING_PAYMENT") return now.getTime() - row.updatedAt.getTime() < holdMs;
  return false;
}

/** A comp must not erase a captured Stripe payment. */
export function compWouldErasePayment(paymentStatus: string): boolean {
  return paymentStatus === "PAID" || paymentStatus === "DISPUTED" || paymentStatus === "PENDING";
}

export function paymentStatusAfterDispute(status: "OPEN" | "WON" | "LOST", current: string): string {
  if (current === "REFUNDED") return current;
  if (status === "WON") return "PAID";
  return "DISPUTED";
}

export function checkoutTestModeNotice(publishableKey: string | null | undefined): string | null {
  if (publishableKey?.startsWith("pk_test_")) {
    return "Stripe test mode. Card 4242 4242 4242 4242 completes a test payment and does not move real money.";
  }
  return null;
}

export function stripeReviewMessage(input: { detailsSubmitted: boolean; cardPaymentsStatus: string }): string | null {
  if (input.detailsSubmitted && input.cardPaymentsStatus !== "active") {
    return "Stripe is reviewing your details. This usually takes a few minutes.";
  }
  return null;
}
