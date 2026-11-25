import { syncStripeReturn } from "@/server/actions";

export default function StripeReturnPage() {
  return (
    <main id="main" className="content-area">
      <div className="ms-wrap prose">
        <h1>Back from Stripe</h1>
        <p>We’ll read your card-payments status from Stripe. Payouts still settle in your Stripe account.</p>
        <form action={syncStripeReturn}><button className="btn btn-solid" type="submit">Refresh status</button></form>
      </div>
    </main>
  );
}
