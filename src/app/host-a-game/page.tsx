import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { saveGame } from "@/server/actions";
import { ROUND_TYPES } from "@/lib/constants";
import { TIME_ZONES } from "@/lib/time";

export const metadata = {
  title: "Host a Mahjong Game in Utah County",
  description: "Host a four-game American Mahjong session. Your address is shared only with players who claim a seat.",
};

export default async function HostPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login/?callbackUrl=/host-a-game/");
  const query = await searchParams;
  const rosters = await prisma.roster.findMany({
    where: { userId: session.user.id, status: "ACTIVE", league: { status: { in: ["OPEN", "IN_PLAY"] } } },
    include: { league: true },
  });
  return (
    <main id="main">
      <header className="page-hero"><div className="eyebrow">Host</div><h1>Host a game</h1></header>
      <div className="content-area"><div className="ms-wrap" style={{ maxWidth: 720 }}>
        {query.error ? <p className="notice error">You need an active roster spot, a part of town, and an address.</p> : null}
        {rosters.length === 0 ? <p>Join a league before hosting. The host has to be on that season’s roster.</p> : (
          <form className="form-grid panel" action={saveGame}>
            <label>League
              <select name="leagueId" required>
                {rosters.map((roster) => <option key={roster.leagueId} value={roster.leagueId}>{roster.league.title}</option>)}
              </select>
            </label>
            <label>Date and time<input type="datetime-local" name="startAt" required /></label>
            <label>Time zone
              <select name="timeZone" defaultValue="America/Denver">{TIME_ZONES.map((zone) => <option key={zone}>{zone}</option>)}</select>
            </label>
            <label>Part of town<input name="partOfTown" required /></label>
            <label>Round
              <select name="roundType">{ROUND_TYPES.map((round) => <option key={round.value} value={round.value}>{round.label}</option>)}</select>
            </label>
            <label>Venue name (optional)<input name="venue" /></label>
            <label>Street address (shown only after a player claims a seat)<input name="address" required /></label>
            <div className="split">
              <label>City<input name="city" /></label>
              <label>State<input name="state" maxLength={2} /></label>
            </div>
            <label>ZIP<input name="zip" /></label>
            <label>Tables<input type="number" name="tablesCount" min={1} max={6} defaultValue={1} /></label>
            <label>Invite up to 3 roster emails, comma separated<input name="invites" /></label>
            <label>Notes<textarea name="notes" /></label>
            <button className="btn btn-solid" type="submit">Post the table</button>
          </form>
        )}
      </div></div>
    </main>
  );
}
