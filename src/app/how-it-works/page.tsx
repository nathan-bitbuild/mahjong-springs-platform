import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How Mahjong Leagues Work in Utah County",
  description: "How 8-week American Mahjong leagues work: hosting, tables, scoring, season awards, and the refund policy.",
};

export default function HowPage() {
  return (
    <main id="main">
      <header className="page-hero">
        <div className="eyebrow">The League</div>
        <h1>How the league <em>works</em></h1>
        <p>A friendly, 8-week American Mahjong league. Play at tables hosted by fellow players, enter your own scores, and climb the public leaderboard.</p>
      </header>
      <div className="content-area"><div className="ms-wrap prose">
        <p><Link className="btn btn-pink" href="/leagues/">See leagues</Link> <Link className="btn" href="/find-a-table/">Find a table</Link></p>
        <h2 id="league">1. Join a league</h2>
        <p>Each Mahjong Springs season runs for 8 weeks. The entry fee is $80, and checkout adds a $5 booking fee ($85 total). Other organizers set their own entry fee; the booking fee stays $5. Create a player account and check out. You’re on the roster when payment succeeds.</p>
        <p>Your name is your leaderboard name unless you pick a display name. The organizer keeps the entry fee. Mahjong Springs keeps the booking fee.</p>
        <h2 id="tables">2. Host or find a table</h2>
        <p>Games happen at tables of 4, hosted by players. Any rostered player can host. Pick a date, the part of town, and a round type: standard, beginner-friendly, mindful-quiet, or social. You can invite up to three friends who are also on the roster.</p>
        <p>The home address stays private. Only players who join the table see it, along with phone numbers of players who chose to share them. Everyone who joins can download a calendar invite. A reminder is recorded for the day before.</p>
        <h2 id="session">3. Play a session</h2>
        <p>A session is 4 games of American Mahjong from the current National Mah Jongg League card. Bring your card. The host provides the set and the space. Play as many sessions as you like.</p>
        <p><a href="/scorecards/mahjong-springs-scorecard-2up.pdf">Scorecard PDF (2 per page)</a> · <a href="/scorecards/mahjong-springs-scorecard-4up.pdf">Scorecard PDF (4 per page)</a></p>
        <h2 id="scoring">4. Enter and confirm scores</h2>
        <p>Each player enters their own results. When the entries agree, another player at the table, the host, or a league manager confirms the sheet and the points count. Nothing counts while the entries conflict.</p>
        <table className="data-table">
          <thead><tr><th>What happened</th><th>Points</th></tr></thead>
          <tbody>
            <tr><td>Winning hand</td><td>The hand’s NMJL card value</td></tr>
            <tr><td>Self-picked win</td><td>+10</td></tr>
            <tr><td>Jokerless hand</td><td>+10</td></tr>
            <tr><td>Wall game (each player)</td><td>+10</td></tr>
            <tr><td>Dead hand in a wall game</td><td>0</td></tr>
            <tr><td>Threw the winning tile</td><td>−10</td></tr>
            <tr><td>No-show without a sub</td><td>−25</td></tr>
          </tbody>
        </table>
        <p>Example: a 30-point jokerless hand, self-picked, scores 30 + 10 + 10 = 50.</p>
        <h2 id="standings">5. The four queens</h2>
        <ul>
          <li><b>Spring Queen.</b> Best 8 sessions, plus no-show penalties and adjustments. Ties go to the higher single session.</li>
          <li><b>Tile Queen.</b> The single highest session of the season.</li>
          <li><b>Consistency Queen.</b> Best average per session after at least 8 sessions. Ties go to more sessions.</li>
          <li><b>Always at the Table.</b> Most games played, 4 per confirmed session. Ties go to more sessions.</li>
        </ul>
        <p><Link href="/leaderboard/">See the standings</Link></p>
        <h2 id="faq">Questions</h2>
        <h3>What is the refund policy?</h3>
        <p>The organizer’s entry fee is refunded in full if you cancel before the league starts. The $5 booking fee is non-refundable. Once the season begins, the entry fee is non-refundable. Email hello@mahjongsprings.com before a Mahjong Springs league’s start date. Other organizers issue their own entry-fee refunds.</p>
        <h3>What if the table disagrees?</h3>
        <p>Nothing counts until the entries match. A confirmed sheet can be flagged with “Request a correction.”</p>
        <h3>Do I have to host?</h3>
        <p>No. Hosting is optional.</p>
        <h3>Who can see my phone and address?</h3>
        <p>Your phone is shown only to players at the same table, and only if you turn on sharing. A host’s address is shown only to players who join that table.</p>
      </div></div>
    </main>
  );
}
