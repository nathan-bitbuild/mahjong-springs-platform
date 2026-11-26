import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canSeePrivateAddress } from "@/lib/scoring";
import { icsForGame } from "@/server/mail";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await auth();
  const game = await prisma.game.findUnique({
    where: { id },
    include: { attendees: true, league: { include: { organization: true } }, host: true },
  });
  if (!game) return new Response("Not found", { status: 404 });
  const isManager = !!session?.user && (session.user.role === "ADMIN" || session.user.organizationId === game.league.organizationId);
  const includeAddress = canSeePrivateAddress({
    userId: session?.user?.id ?? null,
    hostId: game.hostId,
    attendeeIds: game.attendees.map((a) => a.userId),
    isManager,
  });
  if (!includeAddress) return new Response("Claim a seat to download this invite.", { status: 403 });
  const body = icsForGame(game, true);
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="mahjong-${game.id}.ics"`,
    },
  });
}
