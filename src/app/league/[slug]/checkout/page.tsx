import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatUsd, BOOKING_FEE_CENTS } from "@/lib/fees";
import { stripeOrNull, stripePublishableKey } from "@/lib/stripe-server";
import { CheckoutEmbed } from "@/components/checkout-embed";
import { beginCheckout } from "@/server/actions";
import { checkoutSessionIsOpen, registrationAlreadyPaid } from "@/lib/stripe-flow";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const session = await auth();
  const league = await prisma.league.findUnique({ where: { slug }, include: { organization: true } });
  if (!league || league.status === "DRAFT" || league.organization.status !== "APPROVED") notFound();
  const roster = session?.user
    ? await prisma.roster.findUnique({ where: { leagueId_userId: { leagueId: league.id, userId: session.user.id } } })
    : null;
  let publishable: string | null = null;
  let publishableError = "";
  try {
    publishable = stripePublishableKey();
  } catch (error) {
    publishableError = error instanceof Error ? error.message : "Stripe publishable key was rejected.";
  }
  const configured = Boolean(publishable) && !publishableError;
  const stripe = configured ? stripeOrNull() : null;
  let clientSecret: string | null = null;
  if (stripe && publishable && roster?.stripeCheckoutSessionId && league.organization.stripeAccountId) {
    const checkout = await stripe.checkout.sessions.retrieve(
      roster.stripeCheckoutSessionId,
      {},
      { stripeAccount: league.organization.stripeAccountId },
    );
    if (checkoutSessionIsOpen(checkout.status)) clientSecret = checkout.client_secret;
  }
  const ready = league.organization.cardPaymentsStatus === "active" && !!league.organization.stripeAccountId;
  const alreadyPaid = registrationAlreadyPaid(roster?.paymentStatus);
  return (
    <main id="main">
      <header className="page-hero">
        <div className="eyebrow">Checkout</div>
        <h1>{league.title}</h1>
        {league.isTestData ? <p>Test data. This checkout is a sample and will not charge a real card until Stripe test keys are connected.</p> : null}
      </header>
      <div className="content-area"><div className="ms-wrap checkout-grid">
        <aside className="panel fee-box">
          <div><span>Entry fee, kept by {league.organization.name}</span><b>{formatUsd(league.entryFeeCents)}</b></div>
          <div><span>Booking fee, kept by Mahjong Springs</span><b>{formatUsd(BOOKING_FEE_CENTS)}</b></div>
          <div className="total"><span>Due today</span><span>{formatUsd(league.entryFeeCents + BOOKING_FEE_CENTS)}</span></div>
          <p>The $5 booking fee is non-refundable. The organizer issues any entry-fee refund from their own Stripe account. The charge is created on the organizer’s connected account. Mahjong Springs does not hold the entry fee.</p>
        </aside>
        <div className="panel">
          {query.error ? <p className="notice error">{query.error}</p> : null}
          {clientSecret && publishable && league.organization.stripeAccountId ? (
            <CheckoutEmbed clientSecret={clientSecret} publishableKey={publishable} stripeAccount={league.organization.stripeAccountId} />
          ) : (
            <div>
              <h2>Payment</h2>
              {!configured ? (
                <p className="notice error">
                  {publishableError || "Stripe checkout is not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to a pk_test_ key. No Checkout Session is created until that key is set."}
                </p>
              ) : alreadyPaid ? (
                <p>
                  {roster?.status === "WAITLIST"
                    ? "Your payment is already recorded. The season was full, so you are on the waitlist and will not be charged again."
                    : "You’re already registered for this season."}{" "}
                  <Link href={`/league/${league.slug}/`}>Back to the league</Link>
                </p>
              ) : !session?.user ? (
                <p><Link className="btn btn-solid" href={`/login/?callbackUrl=/league/${league.slug}/checkout/`}>Sign in to pay</Link></p>
              ) : ready ? (
                <form action={beginCheckout}>
                  <input type="hidden" name="slug" value={league.slug} />
                  <button className="btn btn-pink" type="submit">Pay {formatUsd(league.entryFeeCents + BOOKING_FEE_CENTS)}</button>
                </form>
              ) : (
                <p>Embedded Checkout mounts here once this organizer finishes Stripe onboarding. Card payments are not active yet, so no Checkout Session is created.</p>
              )}
            </div>
          )}
        </div>
      </div></div>
    </main>
  );
}
