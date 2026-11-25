import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatUsd, BOOKING_FEE_CENTS } from "@/lib/fees";
import { stripeOrNull, stripePublishableKey } from "@/lib/stripe-server";
import { CheckoutEmbed } from "@/components/checkout-embed";
import { beginCheckout } from "@/server/actions";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const league = await prisma.league.findUnique({ where: { slug }, include: { organization: true } });
  if (!league || league.status === "DRAFT" || league.organization.status !== "APPROVED") notFound();
  const roster = session?.user
    ? await prisma.roster.findUnique({ where: { leagueId_userId: { leagueId: league.id, userId: session.user.id } } })
    : null;
  const stripe = stripeOrNull();
  const publishable = stripePublishableKey();
  let clientSecret: string | null = null;
  if (stripe && publishable && roster?.stripeCheckoutSessionId && league.organization.stripeAccountId) {
    const checkout = await stripe.checkout.sessions.retrieve(
      roster.stripeCheckoutSessionId,
      {},
      { stripeAccount: league.organization.stripeAccountId },
    );
    clientSecret = checkout.client_secret;
  }
  const ready = league.organization.cardPaymentsStatus === "active" && !!league.organization.stripeAccountId;
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
          {clientSecret && publishable && league.organization.stripeAccountId ? (
            <CheckoutEmbed clientSecret={clientSecret} publishableKey={publishable} stripeAccount={league.organization.stripeAccountId} />
          ) : (
            <div>
              <h2>Payment</h2>
              {!session?.user ? (
                <p><Link className="btn btn-solid" href={`/login/?callbackUrl=/league/${league.slug}/checkout/`}>Sign in to pay</Link></p>
              ) : roster?.status === "ACTIVE" ? (
                <p>You’re already on this roster. <Link href={`/league/${league.slug}/`}>Back to the league</Link></p>
              ) : ready ? (
                <form action={beginCheckout}>
                  <input type="hidden" name="slug" value={league.slug} />
                  <button className="btn btn-pink" type="submit">Pay {formatUsd(league.entryFeeCents + BOOKING_FEE_CENTS)}</button>
                </form>
              ) : (
                <>
                  <p>Embedded Checkout mounts here once this organizer finishes Stripe onboarding and the server has test-mode keys.</p>
                  <p>The session is a direct charge on the connected account, with <code>application_fee_amount</code> of 500 cents. Use card 4242 4242 4242 4242 in Stripe test mode. Do not use a live key.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div></div>
    </main>
  );
}
