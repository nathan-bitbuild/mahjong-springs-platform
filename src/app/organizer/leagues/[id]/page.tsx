import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { LeagueForm } from "@/components/league-form";
import { compEntry, refundEntry } from "@/server/actions";
import { formatUsd } from "@/lib/fees";

export default async function ManageLeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login/");
  const league = await prisma.league.findUnique({
    where: { id },
    include: { organization: true, rosters: { include: { user: true, ledger: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!league || (league.organizationId !== session.user.organizationId && session.user.role !== "ADMIN")) redirect("/organizer/");
  return (
    <main id="main">
      <header className="page-hero"><div className="eyebrow">Roster</div><h1>{league.title}</h1></header>
      <div className="content-area"><div className="ms-wrap" style={{ display: "grid", gap: 28 }}>
        {query.saved ? <p className="notice ok">Saved.</p> : null}
        <LeagueForm isHome={league.organization.isHome} error={query.error} league={league} />
        <section className="panel">
          <h2>Roster and waitlist</h2>
          <table className="data-table">
            <thead><tr><th>Player</th><th>Status</th><th>Payment</th><th></th></tr></thead>
            <tbody>
              {league.rosters.map((roster) => (
                <tr key={roster.id}>
                  <td>{roster.user.displayName || roster.user.name}<br />{roster.user.email}</td>
                  <td>{roster.status}{roster.source === "COMP" ? " · comp" : ""}</td>
                  <td>{roster.paymentStatus} · {formatUsd(roster.totalCents)}{roster.ledger ? ` · fee ${formatUsd(roster.ledger.platformFeeCents)}` : ""}</td>
                  <td>
                    {roster.paymentStatus === "PAID" ? (
                      <form action={refundEntry}>
                        <input type="hidden" name="rosterId" value={roster.id} />
                        <button className="btn" type="submit">Refund entry fee</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form className="form-grid" action={compEntry} style={{ marginTop: 18 }}>
            <input type="hidden" name="leagueId" value={league.id} />
            <label>Comp an existing player by email<input type="email" name="email" required /></label>
            <button className="btn" type="submit">Add comp entry</button>
          </form>
        </section>
      </div></div>
    </main>
  );
}
