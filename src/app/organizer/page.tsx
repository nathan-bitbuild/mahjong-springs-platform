import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { openStripeDashboard, startStripeOnboarding } from "@/server/actions";
import { formatUsd } from "@/lib/fees";
import { canOpenStripeDashboard } from "@/lib/stripe-flow";

export default async function OrganizerHome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await auth();
  if (!session?.user) redirect("/login/?callbackUrl=/organizer/");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { organization: { include: { leagues: true } } } });
  if (!user?.organization) {
    return (
      <main id="main" className="content-area"><div className="ms-wrap prose">
        <h1>Host a league</h1>
        <p>Organizers keep 100% of their entry fee. Players pay a $5 booking fee on top. Utah leagues are hosted only by Mahjong Springs.</p>
        <p><Link className="btn btn-solid" href="/signup/?organizer=1">Create an organizer account</Link></p>
      </div></main>
    );
  }
  const org = user.organization;
  const query = await searchParams;
  const paid = await prisma.feeLedgerEntry.aggregate({
    where: { organizationId: org.id },
    _sum: { entryFeeCents: true, refundedEntryCents: true },
  });
  return (
    <main id="main">
      <header className="page-hero"><div className="eyebrow">Organizer</div><h1>{org.name}</h1></header>
      <div className="content-area"><div className="ms-wrap">
        {query.error ? <p className="notice error">{query.error}</p> : null}
        {query.stripe ? <p className="notice ok">Stripe status refreshed.</p> : null}
        <div className="dash-grid">
          <aside className="panel">
            <p><span className="pill">{org.status}</span> {org.isHome ? <span className="pill">Home organization</span> : null}</p>
            {org.status === "PENDING" ? <p>Mahjong Springs reviews new organizers before their leagues can be public.</p> : null}
            {org.status === "SUSPENDED" ? <p>This organization is suspended. Public leagues are unpublished.</p> : null}
            <h2>Stripe</h2>
            <p>Card payments: <b>{org.cardPaymentsStatus}</b></p>
            <p>Payouts go from Stripe to your bank. Mahjong Springs never holds the entry fee. You pay Stripe’s processing fee. You own entry-fee refunds and chargebacks in your Stripe Dashboard.</p>
            <form action={startStripeOnboarding}><button className="btn btn-solid" type="submit">{org.stripeAccountId ? "Continue Stripe setup" : "Start Stripe onboarding"}</button></form>
            {canOpenStripeDashboard(org.cardPaymentsStatus) ? <form action={openStripeDashboard}><button className="btn" type="submit">Open Stripe Dashboard</button></form> : null}
            <p>Entry fees recorded here: {formatUsd(paid._sum.entryFeeCents ?? 0)}. Entry fees refunded: {formatUsd(paid._sum.refundedEntryCents ?? 0)}.</p>
          </aside>
          <div>
            <p><Link className="btn btn-pink" href="/organizer/leagues/new/">Create a league</Link></p>
            <table className="data-table">
              <thead><tr><th>League</th><th>Where</th><th>Fee</th><th>Status</th></tr></thead>
              <tbody>
                {org.leagues.map((league) => (
                  <tr key={league.id}>
                    <td><Link href={`/organizer/leagues/${league.id}/`}>{league.title}</Link> {league.isTestData ? <span className="pill test">Test</span> : null}</td>
                    <td>{league.venueCity}, {league.venueState} {league.venueZip}</td>
                    <td>{formatUsd(league.entryFeeCents)}</td>
                    <td>{league.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div></div>
    </main>
  );
}
