import { receiveStripeWebhook } from "@/server/payments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.text();
  try {
    await receiveStripeWebhook(payload, request.headers.get("stripe-signature"));
    return Response.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook";
    return Response.json({ error: message }, { status: 400 });
  }
}
