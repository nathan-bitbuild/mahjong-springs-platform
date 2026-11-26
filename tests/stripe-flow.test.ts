import { describe, expect, it } from "vitest";
import {
  accountIdFromSnapshotEvent,
  accountIdFromThinNotification,
  canOpenStripeDashboard,
  checkoutSessionIsOpen,
  detailsSubmittedFromAccount,
  isThinEventPayload,
  registrationAlreadyPaid,
} from "@/lib/stripe-flow";

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

  it("offers the Stripe Dashboard only after card payments are active", () => {
    expect(canOpenStripeDashboard("active")).toBe(true);
    expect(canOpenStripeDashboard("restricted")).toBe(false);
    expect(canOpenStripeDashboard("pending")).toBe(false);
    expect(canOpenStripeDashboard("inactive")).toBe(false);
  });
});
