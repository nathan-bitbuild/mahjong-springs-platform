import { describe, expect, it } from "vitest";
import {
  accountIdFromSnapshotEvent,
  accountIdFromThinNotification,
  canOpenStripeDashboard,
  checkoutSessionIsOpen,
  checkoutTestModeNotice,
  compWouldErasePayment,
  detailsSubmittedFromAccount,
  isThinEventPayload,
  paymentStatusAfterDispute,
  registrationAlreadyPaid,
  rosterHoldsSeat,
  SEAT_HOLD_MS,
  stripeReviewMessage,
} from "@/lib/stripe-flow";
import { apiPathNeedsInternalSlash, pagePathNeedsTrailingSlash } from "@/lib/http";

const thinAccount = JSON.stringify({
  id: "evt_thin",
  object: "v2.core.event",
  type: "v2.core.account[configuration.merchant].capability_status_updated",
  related_object: { id: "acct_organizer", type: "v2.core.account", url: "/v2/core/accounts/acct_organizer" },
});

const snapshotCheckout = JSON.stringify({
  id: "evt_snap",
  object: "event",
  type: "checkout.session.completed",
  account: "acct_organizer",
  data: { object: { id: "cs_test", object: "checkout.session" } },
});

describe("webhook payload routing", () => {
  it("treats v2.core.event payloads as thin events and snapshot events as v1", () => {
    expect(isThinEventPayload(thinAccount)).toBe(true);
    expect(isThinEventPayload(snapshotCheckout)).toBe(false);
    expect(isThinEventPayload("not-json")).toBe(false);
  });

  it("reads the connected account from related_object.id on thin account events", () => {
    expect(
      accountIdFromThinNotification({
        type: "v2.core.account.updated",
        related_object: { id: "acct_organizer" },
      }),
    ).toBe("acct_organizer");
    expect(
      accountIdFromThinNotification({
        type: "v2.core.account[requirements].updated",
        related_object: { id: "acct_restricted" },
      }),
    ).toBe("acct_restricted");
    expect(accountIdFromThinNotification({ type: "v2.core.event_destination.ping", related_object: null })).toBeNull();
  });

  it("reads event.account only for v1 account.updated snapshots", () => {
    expect(accountIdFromSnapshotEvent({ type: "account.updated", account: "acct_organizer" })).toBe("acct_organizer");
    expect(accountIdFromSnapshotEvent({ type: "checkout.session.completed", account: "acct_organizer" })).toBeNull();
  });
});

describe("onboarding and checkout guards", () => {
  it("does not mark a restricted new account as details submitted", () => {
    expect(
      detailsSubmittedFromAccount({
        cardPaymentsStatus: "restricted",
        summaryStatus: "past_due",
        entryStatuses: ["past_due"],
        requirementsKnown: true,
      }),
    ).toBe(false);
    expect(
      detailsSubmittedFromAccount({
        cardPaymentsStatus: "pending",
        requirementsKnown: false,
      }),
    ).toBe(false);
  });

  it("marks details submitted when card payments are active or nothing is due", () => {
    expect(
      detailsSubmittedFromAccount({
        cardPaymentsStatus: "active",
        summaryStatus: "eventually_due",
        requirementsKnown: true,
      }),
    ).toBe(true);
    expect(
      detailsSubmittedFromAccount({
        cardPaymentsStatus: "pending",
        summaryStatus: "eventually_due",
        entryStatuses: ["eventually_due"],
        requirementsKnown: true,
      }),
    ).toBe(true);
  });

  it("reuses only an open Checkout Session and treats paid waitlist rows as already paid", () => {
    expect(checkoutSessionIsOpen("open")).toBe(true);
    expect(checkoutSessionIsOpen("expired")).toBe(false);
    expect(checkoutSessionIsOpen("complete")).toBe(false);
    expect(registrationAlreadyPaid("PAID")).toBe(true);
    expect(registrationAlreadyPaid("COMP")).toBe(true);
    expect(registrationAlreadyPaid("PENDING")).toBe(false);
  });

  it("keeps API routes free of a trailing-slash redirect and still slashes pages", () => {
    expect(apiPathNeedsInternalSlash("/api/stripe/webhook")).toBe(true);
    expect(apiPathNeedsInternalSlash("/api/stripe/webhook/")).toBe(false);
    expect(apiPathNeedsInternalSlash("/api/stripe/webhook/thin")).toBe(true);
    expect(pagePathNeedsTrailingSlash("/api/stripe/webhook")).toBe(false);
    expect(pagePathNeedsTrailingSlash("/leagues")).toBe(true);
    expect(pagePathNeedsTrailingSlash("/leagues/")).toBe(false);
    expect(pagePathNeedsTrailingSlash("/favicon.ico")).toBe(false);
  });

  it("shows a test-mode checkout notice only for pk_test_ keys", () => {
    expect(checkoutTestModeNotice("pk_test_123")).toMatch(/test mode/i);
    expect(checkoutTestModeNotice(null)).toBeNull();
    expect(checkoutTestModeNotice("")).toBeNull();
  });

  it("explains Stripe review while card payments are not active", () => {
    expect(stripeReviewMessage({ detailsSubmitted: true, cardPaymentsStatus: "restricted" })).toMatch(/reviewing your details/);
    expect(stripeReviewMessage({ detailsSubmitted: true, cardPaymentsStatus: "active" })).toBeNull();
    expect(stripeReviewMessage({ detailsSubmitted: false, cardPaymentsStatus: "restricted" })).toBeNull();
  });

  it("expires abandoned checkout holds and refuses to comp over a payment", () => {
    const now = new Date("2026-11-26T12:00:00.000Z");
    expect(rosterHoldsSeat({ status: "ACTIVE", updatedAt: new Date(0) }, now)).toBe(true);
    expect(rosterHoldsSeat({ status: "PENDING_PAYMENT", updatedAt: now }, now)).toBe(true);
    expect(rosterHoldsSeat({ status: "PENDING_PAYMENT", updatedAt: new Date(now.getTime() - SEAT_HOLD_MS - 1) }, now)).toBe(false);
    expect(compWouldErasePayment("PAID")).toBe(true);
    expect(compWouldErasePayment("COMP")).toBe(false);
    expect(paymentStatusAfterDispute("WON", "DISPUTED")).toBe("PAID");
    expect(paymentStatusAfterDispute("LOST", "DISPUTED")).toBe("DISPUTED");
    expect(paymentStatusAfterDispute("WON", "REFUNDED")).toBe("REFUNDED");
  });

  it("offers the Stripe Dashboard only after card payments are active", () => {
    expect(canOpenStripeDashboard("active")).toBe(true);
    expect(canOpenStripeDashboard("restricted")).toBe(false);
    expect(canOpenStripeDashboard("pending")).toBe(false);
    expect(canOpenStripeDashboard("inactive")).toBe(false);
  });
});
