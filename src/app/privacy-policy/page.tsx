export const metadata = {
  title: "Privacy Policy",
  description: "How Mahjong Springs collects and uses account, table, and payment information.",
};

export default function PrivacyPage() {
  return (
    <main id="main" className="content-area"><div className="ms-wrap prose">
      <h1>Privacy</h1>
      <p>Mahjong Springs stores the name, email, and optional phone number you give us, plus league registrations, table seats, and scores. A host’s street address is stored so players who claim a seat can see it. It is not shown on public pages.</p>
      <p>Payments are processed by Stripe on the organizer’s connected account. Mahjong Springs receives the $5 booking fee and does not store full card numbers.</p>
      <p>The player directory shows name, skill, and part of town to rostered players. Phone numbers are shown only to tablemates when you opt in.</p>
      <p>Questions: hello@mahjongsprings.com.</p>
    </div></main>
  );
}
