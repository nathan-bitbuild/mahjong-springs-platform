import { isThinEventPayload } from "@/lib/stripe-flow";
import { handleThinNotification, parseThinEventNotification } from "@/server/payments";

export const runtime = "nodejs";

/** Accounts v2 thin-event destination. Snapshot events belong on /api/stripe/webhook. */
export async function POST(request: Request) {
  const payload = await request.text();
  if (!isThinEventPayload(payload)) {
    return Response.json({ error: "This endpoint accepts v2 thin events only." }, { status: 400 });
  }
  try {
    const notification = parseThinEventNotification(payload, request.headers.get("stripe-signature"));
    await handleThinNotification(notification);
    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook";
    return Response.json({ error: message }, { status: 400 });
  }
}
