import Stripe from "stripe";
import { assertStripeTestPublishable, assertStripeTestSecret } from "@/lib/fees";

let stripeClient: Stripe | null = null;

export function stripeOrNull(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  assertStripeTestSecret(key);
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2026-11-18.endive",
      typescript: true,
    });
  }
  return stripeClient;
}

export function stripePublishableKey(): string | null {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!key) return null;
  assertStripeTestPublishable(key);
  return key;
}

export function requireStripe(): Stripe {
  const stripe = stripeOrNull();
  if (!stripe) {
    throw new Error("Stripe test keys are not configured. Add STRIPE_SECRET_KEY (rk_test_ or sk_test_) to the environment.");
  }
  return stripe;
}
