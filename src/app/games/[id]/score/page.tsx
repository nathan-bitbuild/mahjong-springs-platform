import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { confirmSheet, saveScores } from "@/server/actions";
import { DEFAULT_SCORING } from "@/lib/scoring";

export default async function ScorePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const session = await auth();
  if (!session?.user) redirect(`/login/?callbackUrl=/games/${id}/score/`);
  const game = await prisma.game.findUnique({
    where: { id },
    include: { attendees: { include: { user: true } }, sheets: { include: { entries: true } }, league: true },
  });
  if (!game) notFound();
  const mine = game.attendees.find((a) => a.userId === session.user.id);
  const tableNo = mine?.tableNo ?? 1;
  const sheet = game.sheets.find((item) => item.tableNo === tableNo);
  const seated = game.attendees.filter((a) => a.tableNo === tableNo);
  return (
    <main id="main">
      <header className="page-hero"><div className="eyebrow">Scores</div><h1>Four games</h1></header>
      <div className="content-area"><div className="ms-wrap" style={{ maxWidth: 760 }}>
        {query.saved ? <p className="notice ok">Saved. Points count after a tablemate, the host, or a league manager confirms a consistent sheet.</p> : null}
        {sheet?.status ? <p>Sheet status: {sheet.status}</p> : null}
        <form className="form-grid panel" action={saveScores}>
          <input type="hidden" name="gameId" value={game.id} />
          <input type="hidden" name="tableNo" value={tableNo} />
          {(session.user.id === game.hostId || session.user.role === "ADMIN") ? (
            <label>Player
              <select name="playerId" defaultValue={session.user.id}>
                {seated.map((attendee) => <option key={attendee.userId} value={attendee.userId}>{attendee.user.displayName || attendee.user.name}</option>)}
              </select>
            </label>
          ) : null}
          {Array.from({ length: DEFAULT_SCORING.gamesPerSession }, (_, index) => {
            const hand = index + 1;
            return (
              <fieldset key={hand}>
                <legend>Game {hand}</legend>
                <label>Result
                  <select name={`outcome_${hand}`} defaultValue="">
                    <option value="">—</option>
                    <option value="won">I won</option>
                    <option value="other">Someone else won</option>
                    <option value="wall">Wall game</option>
                  </select>
                </label>
                <label>Card value<input type="number" name={`value_${hand}`} min={0} defaultValue={0} /></label>
                <label><input type="checkbox" name={`self_${hand}`} value="1" /> Self-picked (+10)</label>
                <label><input type="checkbox" name={`joker_${hand}`} value="1" /> Jokerless (+10)</label>
                <label><input type="checkbox" name={`threw_${hand}`} value="1" /> I threw the winning tile (−10)</label>
                <label><input type="checkbox" name={`dead_${hand}`} value="1" /> Dead hand in a wall game (0)</label>
              </fieldset>
            );
          })}
          <label><input type="checkbox" name="confirm" value="1" /> Confirm this sheet if every entry agrees</label>
          <button className="btn btn-solid" type="submit">Save my results</button>
        </form>
        {sheet?.status === "PENDING" ? (
          <form action={confirmSheet}>
            <input type="hidden" name="sheetId" value={sheet.id} />
            <button className="btn btn-pink" type="submit">Confirm as tablemate or host</button>
          </form>
        ) : null}
      </div></div>
    </main>
  );
}
