import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { joinGame } from "@/server/actions";
import { roundLabel } from "@/lib/constants";

export const metadata = {
  title: "Find a Mahjong Table in Utah County",
  description: "Find an open seat at a player-hosted American Mahjong table. The host’s address stays hidden until you claim a seat.",
};

export default async function FindTablePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const session = await auth();
  const games = await prisma.game.findMany({
    where: {
      status: "SCHEDULED",
      startAt: { gte: new Date() },
      league: { status: { in: ["OPEN", "IN_PLAY"] }, organization: { status: "APPROVED" } },
      ...(query.league ? { league: { slug: query.league, status: { in: ["OPEN", "IN_PLAY"] }, organization: { status: "APPROVED" } } } : {}),
      ...(query.city ? { city: { contains: query.city, mode: "insensitive" } } : {}),
      ...(query.zip ? { zip: { startsWith: query.zip } } : {}),
      ...(query.state ? { state: query.state.toUpperCase() } : {}),
    },
    include: { attendees: true, league: true, host: true },
    orderBy: { startAt: "asc" },
    take: 80,
  });
  const filtered = games.filter((game) => {
    const open = game.tablesCount * 4 - game.attendees.length;
    if (query.open === "1" && open <= 0) return false;
    if (query.from && game.startAt.toISOString().slice(0, 10) < query.from) return false;
    if (query.to && game.startAt.toISOString().slice(0, 10) > query.to) return false;
    return true;
  });
  return (
    <main id="main">
      <header className="page-hero">
        <div className="eyebrow">Tables</div>
        <h1>Find a table</h1>
        <p>Open seats at player-hosted games. The street address stays hidden until you claim a seat.</p>
      </header>
      <div className="content-area"><div className="ms-wrap">
        <form className="form-grid" method="get" style={{ marginBottom: 28 }}>
          <div className="split">
            <label>City<input name="city" defaultValue={query.city || ""} /></label>
            <label>State<input name="state" defaultValue={query.state || ""} maxLength={2} /></label>
          </div>
          <div className="split">
            <label>ZIP<input name="zip" defaultValue={query.zip || ""} /></label>
            <label>From<input type="date" name="from" defaultValue={query.from || ""} /></label>
          </div>
          <label><input type="checkbox" name="open" value="1" defaultChecked={query.open === "1"} /> Open seats only</label>
          <button className="btn" type="submit">Search</button>
        </form>
        {filtered.length === 0 ? <p className="empty">No upcoming tables match.</p> : filtered.map((game) => {
          const open = game.tablesCount * 4 - game.attendees.length;
          const joined = game.attendees.some((a) => a.userId === session?.user?.id);
          return (
            <article className="panel" key={game.id} style={{ marginBottom: 16 }}>
              <h2><Link href={`/games/${game.id}/`}>{game.league.title}</Link> {game.isTestData ? <span className="pill test">Test data</span> : null}</h2>
              <p>{game.startAt.toLocaleString("en-US", { timeZone: game.timeZone, dateStyle: "full", timeStyle: "short" })} · {roundLabel(game.roundType)}</p>
              <p>{game.partOfTown ? `${game.partOfTown}, ` : ""}{game.city}, {game.state} {game.zip}</p>
              <p>{open} open {open === 1 ? "seat" : "seats"} of {game.tablesCount * 4}. Host: {game.host.displayName || game.host.name}. Address hidden until you join.</p>
              {joined ? <Link className="btn" href={`/games/${game.id}/`}>Your seat</Link> : (
                <form action={joinGame}><input type="hidden" name="gameId" value={game.id} /><button className="btn btn-pink" type="submit" disabled={open <= 0}>Join</button></form>
              )}
            </article>
          );
        })}
      </div></div>
    </main>
  );
}
