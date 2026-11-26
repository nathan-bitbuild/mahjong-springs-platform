import { prisma } from "@/lib/db";
import { buildGameIcs } from "@/lib/ics";
import { siteUrl } from "@/lib/constants";

export async function runScheduledMail(now = new Date()) {
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const upcoming = await prisma.game.findMany({
    where: { status: "SCHEDULED", startAt: { gt: now, lte: soon } },
    include: { attendees: { include: { user: true } }, league: true, host: true },
  });
  let reminders = 0;
  for (const game of upcoming) {
    for (const attendee of game.attendees) {
      if (!attendee.user.emailReminders) continue;
      const key = `reminder:${game.id}:${attendee.userId}`;
      const exists = await prisma.mailLog.findUnique({ where: { mailKey: key } });
      if (exists) continue;
      const privateView = true;
      const where = [game.partOfTown, game.city, game.state].filter(Boolean).join(", ");
      const address = privateView ? game.address : "";
      const body = [
        `Hi ${attendee.user.name},`,
        ``,
        `Reminder: ${game.league.title} is tomorrow.`,
        `${game.startAt.toISOString()} · ${where}`,
        address ? `Address: ${address}` : "The host’s address is on your table page.",
        `${siteUrl()}/games/${game.id}/`,
      ].join("\n");
      await prisma.mailLog.create({
        data: {
          mailKey: key,
          type: "reminder",
          userId: attendee.userId,
          email: attendee.user.email,
          status: "logged",
          body,
        },
      });
      reminders += 1;
    }
  }

  const scoresDueAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const started = await prisma.game.findMany({
    where: { status: "SCHEDULED", startAt: { lt: new Date(now.getTime() - 3 * 60 * 60 * 1000), gt: scoresDueAfter } },
    include: { attendees: { include: { user: true } }, sheets: true, league: true },
  });
  let scoresDue = 0;
  for (const game of started) {
    const tables = new Set(game.attendees.map((a) => a.tableNo));
    for (const tableNo of tables) {
      const sheet = game.sheets.find((item) => item.tableNo === tableNo);
      if (sheet?.status === "CONFIRMED") continue;
      for (const attendee of game.attendees.filter((a) => a.tableNo === tableNo)) {
        if (!attendee.user.emailScores) continue;
        const key = `scores:${game.id}:${tableNo}:${attendee.userId}`;
        const exists = await prisma.mailLog.findUnique({ where: { mailKey: key } });
        if (exists) continue;
        await prisma.mailLog.create({
          data: {
            mailKey: key,
            type: "scores_due",
            userId: attendee.userId,
            email: attendee.user.email,
            status: "logged",
            body: `Scores are still open for ${game.league.title}, table ${tableNo}. Enter them at ${siteUrl()}/games/${game.id}/score/`,
          },
        });
        scoresDue += 1;
      }
    }
  }
  return { reminders, scoresDue };
}

export function icsForGame(game: {
  id: string;
  startAt: Date;
  address: string;
  city: string;
  state: string;
  zip: string;
  partOfTown: string;
  league: { title: string };
}, includeAddress: boolean) {
  const place = includeAddress
    ? [game.address, game.city, game.state, game.zip].filter(Boolean).join(", ")
    : [game.partOfTown, game.city, game.state].filter(Boolean).join(", ");
  return buildGameIcs({
    uid: `game-${game.id}@mahjongsprings.com`,
    title: `${game.league.title} mahjong`,
    start: game.startAt,
    location: place || "Player-hosted table",
    description: includeAddress
      ? "Your seat is saved. The address is included because you joined this table."
      : "Join the table to receive the host’s address.",
    url: `${siteUrl()}/games/${game.id}/`,
  });
}
