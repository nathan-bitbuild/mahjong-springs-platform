import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { setOrganizerStatus } from "@/server/actions";
import { formatUsd } from "@/lib/fees";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/login/?callbackUrl=/admin/");
  const query = await searchParams;
  const orgs = await prisma.organization.findMany({ include: { owner: true, _count: { select: { leagues: true } } }, orderBy: { createdAt: "asc" } });
  const ledger = await prisma.feeLedgerEntry.findMany({
    include: { organization: true, roster: { include: { user: true, league: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const totals = ledger.reduce(
    (sum, row) => {
      sum.gross += row.grossCents;
      sum.fees += row.platformFeeCents;
      sum.refunds += row.refundedEntryCents;
      if (row.disputeStatus !== "NONE") sum.disputes += 1;
      return sum;
    },
    { gross: 0, fees: 0, refunds: 0, disputes: 0 },
  );
  return (
    <main id="main">
      <header className="page-hero"><div className="eyebrow">Mahjong Springs</div><h1>Platform admin</h1></header>
      <div className="content-area"><div className="ms-wrap">
        {query.saved ? <p className="notice ok">Updated.</p> : null}
        <div className="stat-row">
          <article><strong>{ledger.length}</strong>Registrations in view</article>
          <article><strong>{formatUsd(totals.gross)}</strong>Gross volume</article>
          <article><strong>{formatUsd(totals.fees)}</strong>$5 fees collected</article>
          <article><strong>{formatUsd(totals.refunds)}</strong>Entry refunds · {totals.disputes} disputes</article>
        </div>
        <h2>Organizers</h2>
        <table className="data-table">
          <thead><tr><th>Organization</th><th>Owner</th><th>Status</th><th>Stripe</th><th></th></tr></thead>
          <tbody>
            {orgs.map((org) => (
              <tr key={org.id}>
                <td>{org.name}{org.isHome ? " · home" : ""}{org.isTestData ? " · test" : ""}<br />{org._count.leagues} leagues</td>
                <td>{org.owner.name}<br />{org.owner.email}</td>
                <td>{org.status}</td>
                <td>{org.cardPaymentsStatus}</td>
                <td>
                  {org.isHome ? "Home leagues stay with Lyndsey and Denise." : (
                    <form action={setOrganizerStatus} style={{ display: "flex", gap: 8 }}>
                      <input type="hidden" name="organizationId" value={org.id} />
                      <button className="btn" name="status" value="APPROVED" type="submit">Approve</button>
                      <button className="btn" name="status" value="SUSPENDED" type="submit">Suspend</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <h2>Platform fee ledger</h2>
        <table className="data-table">
          <thead><tr><th>When</th><th>Organizer</th><th>Player</th><th>Gross</th><th>Entry</th><th>Fee</th><th>Refunded</th><th>Dispute</th></tr></thead>
          <tbody>
            {ledger.map((row) => (
              <tr key={row.id}>
                <td>{row.createdAt.toISOString().slice(0, 10)}{row.isTestData ? " · test" : ""}</td>
                <td>{row.organization.name}</td>
                <td>{row.roster.user.name}<br />{row.roster.league.title}</td>
                <td>{formatUsd(row.grossCents)}</td>
                <td>{formatUsd(row.entryFeeCents)}</td>
                <td>{formatUsd(row.platformFeeCents)}</td>
                <td>{formatUsd(row.refundedEntryCents)}</td>
                <td>{row.disputeStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>
    </main>
  );
}
