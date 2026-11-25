import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login/?callbackUrl=/account/");
  const rosters = await prisma.roster.findMany({
    where: { userId: session.user.id },
    include: { league: true },
    orderBy: { createdAt: "desc" },
  });
  const games = await prisma.attendee.findMany({
    where: { userId: session.user.id, game: { startAt: { gte: new Date() }, status: "SCHEDULED" } },
    include: { game: { include: { league: true } } },
    orderBy: { game: { startAt: "asc" } },
  });
  return (
    <main id="main">
      <header className="page-hero"><div className="eyebrow">Player</div><h1>My league</h1></header>
      <div className="content-area"><div className="ms-wrap">
        <p><Link href="/my-profile/">Profile</Link> · <Link href="/find-a-table/">Find a table</Link> · <Link href="/host-a-game/">Host a game</Link>
          {session.user.role === "ORGANIZER" || session.user.role === "ADMIN" ? <> · <Link href="/organizer/">Organizer</Link></> : null}
          {session.user.role === "ADMIN" ? <> · <Link href="/admin/">Admin</Link></> : null}
        </p>
        <h2>Registrations</h2>
        {rosters.length === 0 ? <p>You haven’t joined a season yet.</p> : (
          <ul>{rosters.map((roster) => <li key={roster.id}><Link href={`/league/${roster.league.slug}/`}>{roster.league.title}</Link> · {roster.status} · {roster.paymentStatus}</li>)}</ul>
        )}
        <h2>Upcoming tables</h2>
        {games.length === 0 ? <p>No upcoming seats.</p> : games.map((seat) => (
          <p key={seat.id}><Link href={`/games/${seat.gameId}/`}>{seat.game.league.title}</Link> · table {seat.tableNo} · {seat.game.startAt.toLocaleString()}</p>
        ))}
      </div></div>
    </main>
  );
}
