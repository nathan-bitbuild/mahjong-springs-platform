export const metadata = {
  title: "Terms of Service",
  description: "Terms for Mahjong Springs leagues, including the $5 booking fee, organizer entry fees, and refunds.",
};

export default function TermsPage() {
  return (
    <main id="main" className="content-area"><div className="ms-wrap prose">
      <h1>Terms</h1>
      <p>Registering for a league is a payment to that league’s organizer for the entry fee, plus a $5 booking fee to Mahjong Springs. The organizer keeps the entry fee. The booking fee is non-refundable.</p>
      <p>For Mahjong Springs home leagues, the entry fee is refunded in full if you cancel before the season starts. After the season begins, the entry fee is non-refundable. Other organizers issue and own their entry-fee refunds and chargebacks from their Stripe Dashboard.</p>
      <p>Only Mahjong Springs may create or publish leagues in Utah. Players host tables at their own homes or gathering places. Scores count after a tablemate, the host, or a league manager confirms them.</p>
      <p>Questions: hello@mahjongsprings.com.</p>
    </div></main>
  );
}
