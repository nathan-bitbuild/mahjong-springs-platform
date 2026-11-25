import Link from "next/link";
import { stripeOrNull } from "@/lib/stripe-server";
import { fulfillPaidSession } from "@/server/payments";
import { prisma } from "@/lib/db";

export default async function CheckoutReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { slug } = await params;
  const { session_id: sessionId } = await searchParams;
  const league = await prisma.league.findUnique({ where: { slug }, include: { organization: true } });
  let paid = false;
  if (sessionId && league?.organization.stripeAccountId) {
    const stripe = stripeOrNull();
    if (stripe) {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {}, { stripeAccount: league.organization.stripeAccountId });
      if (session.payment_status === "paid") {
        await fulfillPaidSession(session);
        paid = true;
      }
    }
  }
  return (
    <main id="main" className="content-area">
      <div className="ms-wrap prose">
        <h1>{paid ? "You’re registered" : "Payment still processing"}</h1>
        <p>{paid ? "The roster updates when payment succeeds. A webhook confirms the same registration if you never reach this page." : "If you paid, the webhook will add you to the roster. Refresh this page in a moment."}</p>
        <p><Link href={`/league/${slug}/`}>Back to the league</Link></p>
      </div>
    </main>
  );
}
