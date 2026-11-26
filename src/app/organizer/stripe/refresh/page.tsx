import { startStripeOnboarding } from "@/server/actions";

export default function StripeRefreshPage() {
  return (
    <main id="main" className="content-area">
      <div className="ms-wrap prose">
        <h1>Stripe link expired</h1>
        <p>Account Links are single use. Create a new one to continue onboarding.</p>
        <form action={startStripeOnboarding}><button className="btn btn-solid" type="submit">New onboarding link</button></form>
      </div>
    </main>
  );
}
