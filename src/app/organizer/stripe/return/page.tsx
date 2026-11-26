import { syncStripeReturn } from "@/server/actions";

export default async function StripeReturnPage() {
  await syncStripeReturn();
}
