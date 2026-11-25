"use client";

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useMemo } from "react";

export function CheckoutEmbed({
  clientSecret,
  publishableKey,
  stripeAccount,
}: {
  clientSecret: string;
  publishableKey: string;
  stripeAccount: string;
}) {
  const stripePromise = useMemo(
    () => loadStripe(publishableKey, { stripeAccount }),
    [publishableKey, stripeAccount],
  );
  return (
    <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
