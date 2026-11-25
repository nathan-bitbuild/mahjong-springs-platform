/**
 * Booking-fee math for direct charges.
 *
 * Stripe collects its processing fee from the connected account when
 * fees_collector is "stripe". The application fee is only the platform's $5,
 * and Stripe does not take an additional fee on that application fee.
 * See docs.stripe.com/connect/direct-charges-fee-payer-behavior.
 */

export const BOOKING_FEE_CENTS = 500;

/** Explicit. Stripe's default is already false; we never refund the booking fee. */
export const REFUND_APPLICATION_FEE = false;

export const STRIPE_CHARGE_MODEL = {
  pattern: "direct",
  accountsApi: "v2",
  dashboard: "full",
  feesCollector: "stripe",
  lossesCollector: "stripe",
  settlement: "net",
  checkoutUiMode: "embedded_page",
  applicationFeeCents: BOOKING_FEE_CENTS,
  refundApplicationFee: REFUND_APPLICATION_FEE,
} as const;

export function checkoutTotalCents(entryFeeCents: number): number {
  if (!Number.isInteger(entryFeeCents) || entryFeeCents < 0) {
    throw new Error("Entry fee must be a non-negative integer number of cents.");
  }
  return entryFeeCents + BOOKING_FEE_CENTS;
}

/** What the platform keeps on a successful registration. */
export function platformNetCents(refundApplicationFee: boolean = REFUND_APPLICATION_FEE): number {
  return refundApplicationFee ? 0 : BOOKING_FEE_CENTS;
}

/**
 * Connected-account remainder before Stripe's own processing fee.
 * The booking fee has already been removed as the application fee.
 */
export function organizerNetBeforeStripeFeeCents(entryFeeCents: number): number {
  return entryFeeCents;
}

export function feeLedgerForPayment(entryFeeCents: number) {
  return {
    grossCents: checkoutTotalCents(entryFeeCents),
    entryFeeCents,
    platformFeeCents: BOOKING_FEE_CENTS,
    refundApplicationFee: REFUND_APPLICATION_FEE as false,
  };
}

export function feeLedgerForComp(entryFeeCents: number) {
  return {
    grossCents: 0,
    entryFeeCents,
    platformFeeCents: 0,
    refundApplicationFee: REFUND_APPLICATION_FEE as false,
  };
}

export type CheckoutBuildInput = {
  leagueTitle: string;
  entryFeeCents: number;
  rosterId: string;
  leagueId: string;
  userId: string;
  stripeAccountId: string;
  returnUrl: string;
  customerEmail: string;
  integrationIdentifier: string;
};

export function buildDirectChargeCheckout(input: CheckoutBuildInput) {
  const total = checkoutTotalCents(input.entryFeeCents);
  const params = {
    mode: "payment" as const,
    ui_mode: STRIPE_CHARGE_MODEL.checkoutUiMode,
    customer_email: input.customerEmail,
    client_reference_id: input.rosterId,
    integration_identifier: input.integrationIdentifier,
    return_url: input.returnUrl,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: total,
          product_data: {
            name: input.leagueTitle,
            description: "League entry fee plus a $5.00 booking fee. The booking fee is non-refundable.",
          },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: BOOKING_FEE_CENTS,
      metadata: {
        rosterId: input.rosterId,
        leagueId: input.leagueId,
        userId: input.userId,
        entryFeeCents: String(input.entryFeeCents),
        bookingFeeCents: String(BOOKING_FEE_CENTS),
      },
    },
    metadata: {
      rosterId: input.rosterId,
      leagueId: input.leagueId,
      userId: input.userId,
    },
  };

  return {
    params,
    options: {
      stripeAccount: input.stripeAccountId,
      idempotencyKey: `roster_${input.rosterId}_checkout`,
    },
  };
}

export function buildEntryFeeRefund(input: {
  paymentIntentId: string;
  entryFeeCents: number;
  stripeAccountId: string;
  rosterId: string;
}) {
  return {
    params: {
      payment_intent: input.paymentIntentId,
      amount: input.entryFeeCents,
      refund_application_fee: REFUND_APPLICATION_FEE,
      metadata: { rosterId: input.rosterId, reason: "entry_fee" },
    },
    options: {
      stripeAccount: input.stripeAccountId,
      idempotencyKey: `roster_${input.rosterId}_entry_refund`,
    },
  };
}

export function buildConnectedAccountCreate(input: { displayName: string; contactEmail: string }) {
  return {
    display_name: input.displayName,
    contact_email: input.contactEmail,
    dashboard: STRIPE_CHARGE_MODEL.dashboard,
    identity: { country: "us" },
    defaults: {
      responsibilities: {
        fees_collector: STRIPE_CHARGE_MODEL.feesCollector,
        losses_collector: STRIPE_CHARGE_MODEL.lossesCollector,
      },
    },
    configuration: {
      merchant: {
        capabilities: {
          card_payments: { requested: true },
        },
      },
    },
  };
}

export function cardPaymentsActive(account: {
  configuration?: { merchant?: { capabilities?: { card_payments?: { status?: string } } } };
} | null | undefined): boolean {
  return account?.configuration?.merchant?.capabilities?.card_payments?.status === "active";
}

const TEST_KEY = /^(sk|rk)_test_/;
const TEST_PUBLISHABLE = /^pk_test_/;

export function assertStripeTestSecret(key: string): void {
  if (!TEST_KEY.test(key)) {
    throw new Error("Refusing to use a Stripe key that is not a test-mode secret or restricted key (sk_test_ or rk_test_).");
  }
}

export function assertStripeTestPublishable(key: string): void {
  if (!TEST_PUBLISHABLE.test(key)) {
    throw new Error("Refusing to use a Stripe publishable key that is not test mode (pk_test_).");
  }
}

export function integrationIdentifier(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let suffix = "";
  for (let i = 0; i < 8; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `mahjong-springs-${suffix}`;
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
