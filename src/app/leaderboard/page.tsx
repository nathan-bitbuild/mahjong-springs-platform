import { prisma } from "@/lib/db";
import { awardBoard, buildPlayerFacts, type AwardKey, type SessionFact } from "@/lib/awards";
import { computeSheetPoints, type HandInput } from "@/lib/scoring";
import { AwardBoard } from "@/components/award-board";
import Link from "next/link";

export const metadata = {
  title: "Mahjong League Leaderboard in Utah County",
  description: "Season awards for American Mahjong leagues: Spring Queen, Tile Queen, Consistency Queen, and Always at the Table.",
};

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ league?: string }> }) {
  const query = await searchParams;
  const leagues = await prisma.league.findMany({
    where: { status: { in: ["OPEN", "IN_PLAY", "CLOSED", "UPCOMING"] }, organization: { status: "APPROVED" } },
    orderBy: { startDate: "desc" },
  });
  const league = leagues.find((item) => item.slug === query.league) ?? leagues[0];
  if (!league) {
    return <main id="main" className="content-area"><div className="ms-wrap"><h1>Leaderboard</h1><p>No public season yet.</p></div></main>;
  }
  const sheets = await prisma.scoreSheet.findMany({
    where: { status: "CONFIRMED", game: { leagueId: league.id, status: { not: "CANCELLED" } } },
    include: { hands: true, game: { include: { attendees: true } } },
  });
  const roster = await prisma.roster.findMany({ where: { leagueId: league.id, status: "ACTIVE" }, include: { user: true } });
  const adjustments = await prisma.adjustment.groupBy({ by: ["userId"], where: { leagueId: league.id }, _sum: { points: true } });
  const sessions: Record<string, SessionFact[]> = {};
  for (const sheet of sheets) {
    const players = sheet.game.attendees.filter((a) => a.tableNo === sheet.tableNo).map((a) => a.userId);
    const noshows = (sheet.noshows && typeof sheet.noshows === "object" ? sheet.noshows : {}) as Record<string, boolean>;
    const hands: HandInput[] = sheet.hands.map((hand) => ({
      handNo: hand.handNo,
      winnerId: hand.winnerId,
      handValue: hand.handValue,
      selfPicked: hand.selfPicked,
      jokerless: hand.jokerless,
      discarderId: hand.discarderId,
      deadHands: hand.deadHands ? hand.deadHands.split(",").filter(Boolean) : [],
    }));
    const points = computeSheetPoints(players, noshows, hands);
    for (const [userId, row] of Object.entries(points)) {
      sessions[userId] ??= [];
      sessions[userId].push({
        userId,
        points: row.points,
        games: row.games,
        noshow: userId in noshows,
        startAt: sheet.game.startAt.toISOString(),
        gameId: sheet.gameId,
      });
    }
  }
  const names = Object.fromEntries(roster.map((row) => [row.userId, row.user.displayName || row.user.name]));
  const facts = buildPlayerFacts(
    roster.map((row) => row.userId),
    sessions,
    Object.fromEntries(adjustments.map((row) => [row.userId, row._sum.points ?? 0])),
    names,
  );
  const keys: AwardKey[] = ["spring", "tile", "consistency", "table"];
  const boards = Object.fromEntries(keys.map((key) => [key, awardBoard(facts, key)])) as Record<AwardKey, ReturnType<typeof awardBoard>>;
  return (
    <main id="main">
      <header className="page-hero"><div className="eyebrow">Standings</div><h1>Leaderboard</h1></header>
      <div className="content-area"><div className="ms-wrap">
        {league.isTestData ? <p className="notice">Test data. These standings are sample scores, not live results.</p> : null}
        <form method="get">
          <label>Season
            <select name="league" defaultValue={league.slug}>
              {leagues.map((item) => <option key={item.id} value={item.slug}>{item.title}</option>)}
            </select>
          </label>
          <button className="btn" type="submit">Show</button>
        </form>
        <AwardBoard boards={boards} />
        <p><Link href={`/league/${league.slug}/`}>League page</Link></p>
      </div></div>
    </main>
  );
}
