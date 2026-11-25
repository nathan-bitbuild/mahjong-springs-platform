import { describe, expect, it } from "vitest";
import {
  BOOKING_FEE_CENTS,
  REFUND_APPLICATION_FEE,
  STRIPE_CHARGE_MODEL,
  assertStripeTestSecret,
  buildConnectedAccountCreate,
  buildDirectChargeCheckout,
  buildEntryFeeRefund,
  cardPaymentsActive,
  checkoutTotalCents,
  feeLedgerForComp,
  feeLedgerForPayment,
  organizerNetBeforeStripeFeeCents,
  platformNetCents,
} from "@/lib/fees";

describe("booking fee math", () => {
  it("charges the entry fee plus a flat $5 and nets the platform exactly $5", () => {
    expect(checkoutTotalCents(8000)).toBe(8500);
    expect(BOOKING_FEE_CENTS).toBe(500);
    const ledger = feeLedgerForPayment(8000);
    expect(ledger.grossCents).toBe(8500);
    expect(ledger.platformFeeCents).toBe(500);
    expect(ledger.entryFeeCents).toBe(8000);
    expect(platformNetCents(ledger.refundApplicationFee)).toBe(500);
    expect(organizerNetBeforeStripeFeeCents(8000)).toBe(8000);
  });

  it("keeps the booking fee when the entry fee is refunded", () => {
    const refund = buildEntryFeeRefund({
      paymentIntentId: "pi_test",
      entryFeeCents: 8000,
      stripeAccountId: "acct_test",
      rosterId: "roster_1",
    });
    expect(refund.params.amount).toBe(8000);
    expect(refund.params.refund_application_fee).toBe(false);
    expect(REFUND_APPLICATION_FEE).toBe(false);
    expect(platformNetCents(false)).toBe(500);
    expect(platformNetCents(true)).toBe(0);
  });

  it("does not collect a platform fee on a comp", () => {
    expect(feeLedgerForComp(8000)).toEqual({
      grossCents: 0,
      entryFeeCents: 8000,
      platformFeeCents: 0,
      refundApplicationFee: false,
    });
  });

  it("builds a direct charge on the connected account with application_fee_amount 500", () => {
    const built = buildDirectChargeCheckout({
      leagueTitle: "Spring season",
      entryFeeCents: 8000,
      rosterId: "roster_1",
      leagueId: "league_1",
      userId: "user_1",
      stripeAccountId: "acct_organizer",
      returnUrl: "https://www.mahjongsprings.com/league/spring/checkout/return/?session_id={CHECKOUT_SESSION_ID}",
      customerEmail: "player@example.test",
      integrationIdentifier: "mahjong-springs-abcdefgh",
    });
    expect(built.options.stripeAccount).toBe("acct_organizer");
    expect(built.params.ui_mode).toBe("embedded_page");
    expect(built.params.payment_intent_data.application_fee_amount).toBe(500);
    expect(built.params.line_items[0].price_data.unit_amount).toBe(8500);
    expect(built.params.integration_identifier).toMatch(/[a-z]{8}$/);
    expect(JSON.stringify(built.params)).not.toContain("payment_method_types");
    expect(built.params.mode).toBe("payment");
  });

  it("configures Accounts v2 so the organizer pays Stripe and owns losses", () => {
    const account = buildConnectedAccountCreate({
      displayName: "Test Organizer",
      contactEmail: "organizer@example.test",
    });
    expect(account.dashboard).toBe("full");
    expect(account.defaults.responsibilities.fees_collector).toBe("stripe");
    expect(account.defaults.responsibilities.losses_collector).toBe("stripe");
    expect(account.configuration.merchant.capabilities.card_payments.requested).toBe(true);
    expect(STRIPE_CHARGE_MODEL.pattern).toBe("direct");
    expect(STRIPE_CHARGE_MODEL.settlement).toBe("net");
    expect(STRIPE_CHARGE_MODEL.accountsApi).toBe("v2");
  });

  it("treats card payments as ready only when the v2 capability is active", () => {
    expect(cardPaymentsActive({ configuration: { merchant: { capabilities: { card_payments: { status: "active" } } } } })).toBe(true);
    expect(cardPaymentsActive({ configuration: { merchant: { capabilities: { card_payments: { status: "pending" } } } } })).toBe(false);
    expect(cardPaymentsActive(null)).toBe(false);
  });

  it("refuses live Stripe keys", () => {
    expect(() => assertStripeTestSecret("sk_live_abc")).toThrow(/test-mode/);
    expect(() => assertStripeTestSecret("rk_live_abc")).toThrow(/test-mode/);
    expect(() => assertStripeTestSecret("sk_test_abc")).not.toThrow();
    expect(() => assertStripeTestSecret("rk_test_abc")).not.toThrow();
  });
});
