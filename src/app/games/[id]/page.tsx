import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { canSeePrivateAddress } from "@/lib/scoring";
import { joinGame, leaveGame, requestCorrection } from "@/server/actions";
import { googleCalendarUrl } from "@/lib/ics";
import { roundLabel } from "@/lib/constants";

export default async function GamePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const query = await searchParams;
  const session = await auth();
  const game = await prisma.game.findUnique({
    where: { id },
    include: { attendees: { include: { user: true } }, league: { include: { organization: true } }, host: true, sheets: true },
  });
  if (!game || game.league.organization.status !== "APPROVED" || game.league.status === "DRAFT") notFound();
  const isManager = !!session?.user && (session.user.role === "ADMIN" || session.user.organizationId === game.league.organizationId);
  const showAddress = canSeePrivateAddress({
    userId: session?.user?.id ?? null,
    hostId: game.hostId,
    attendeeIds: game.attendees.map((a) => a.userId),
    isManager,
  });
  const joined = game.attendees.some((a) => a.userId === session?.user?.id);
  const gcal = googleCalendarUrl({
    title: `${game.league.title} mahjong`,
    start: game.startAt,
    location: showAddress ? game.address : `${game.partOfTown}, ${game.city}`,
    details: "American Mahjong, four games.",
  });
  return (
    <main id="main">
      <header className="page-hero">
        <div className="eyebrow">{game.league.title}</div>
        <h1>{roundLabel(game.roundType)} table</h1>
        <p>{game.startAt.toLocaleString("en-US", { timeZone: game.timeZone, dateStyle: "full", timeStyle: "short" })}</p>
      </header>
      <div className="content-area"><div className="ms-wrap prose">
        {game.isTestData ? <p className="notice">Test data.</p> : null}
        {query.joined ? <p className="notice ok">Seat saved. The address is now visible, and you can add the game to your calendar.</p> : null}
        <p>{game.partOfTown}, {game.city}, {game.state} {game.zip}</p>
        {showAddress ? <p><strong>Address:</strong> {game.address}{game.venue ? ` · ${game.venue}` : ""}</p> : <p>The host’s address is hidden until you claim a seat.</p>}
        <p>Host: {game.host.displayName || game.host.name}</p>
        {game.notes ? <p>{game.notes}</p> : null}
        <h2>Players</h2>
        <ul>
          {game.attendees.map((attendee) => (
            <li key={attendee.id}>Table {attendee.tableNo}: {attendee.user.displayName || attendee.user.name}
              {showAddress && attendee.user.sharePhone && attendee.user.phone ? ` · ${attendee.user.phone}` : ""}
            </li>
          ))}
        </ul>
        <p>
          {joined ? <a className="btn" href={`/api/games/${game.id}/ics/`}>Download .ics</a> : null}{" "}
          <a className="btn" href={gcal}>Google Calendar</a>{" "}
          <Link className="btn" href={`/games/${game.id}/score/`}>Enter scores</Link>
        </p>
        {joined && session?.user?.id !== game.hostId ? (
          <form action={leaveGame}><input type="hidden" name="gameId" value={game.id} /><button className="btn" type="submit">Leave this table</button></form>
        ) : null}
        {!joined ? <form action={joinGame}><input type="hidden" name="gameId" value={game.id} /><button className="btn btn-pink" type="submit">Claim a seat</button></form> : null}
        <h2>Request a correction</h2>
        <form action={requestCorrection} className="form-grid">
          <input type="hidden" name="gameId" value={game.id} />
          <label>Table<input name="tableNo" type="number" min={1} defaultValue={1} /></label>
          <label>What should change?<textarea name="note" required /></label>
          <button className="btn" type="submit">Send to the host</button>
        </form>
      </div></div>
    </main>
  );
}
