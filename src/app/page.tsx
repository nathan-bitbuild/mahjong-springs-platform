import Link from "next/link";
import { prisma } from "@/lib/db";
import { AREA_LIST } from "@/lib/areas";
import { formatUsd } from "@/lib/fees";
import { subscribeNewsletter } from "@/server/actions";
import { organizationJsonLd } from "@/lib/jsonld";

function when(date: Date) {
  return {
    m: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
    d: date.toLocaleDateString("en-US", { day: "2-digit", timeZone: "UTC" }),
    w: date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
  };
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ news?: string }> }) {
  const query = await searchParams;
  const leagues = await prisma.league.findMany({
    where: { status: { in: ["UPCOMING", "OPEN", "IN_PLAY"] }, organization: { status: "APPROVED" } },
    include: { rosters: { where: { status: "ACTIVE" } }, organization: true },
    orderBy: { startDate: "asc" },
    take: 4,
  });
  const news = query.news === "ok" ? "You’re on the list for The Table Talk Letter." : query.news === "exists" ? "That email is already on the list." : query.news === "invalid" ? "Enter a valid email address." : "";
  return (
    <main id="main" className="ms-home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }} />
      <section className="ms-hero" aria-labelledby="ms-hero-title">
        <div className="ms-wrap">
          <div>
            <div className="eyebrow">Eight-week league play</div>
            <h1 id="ms-hero-title">
              Same tiles.
              <br />
              A little more on the <span className="script">line</span>.
            </h1>
            <p className="lede">Join a league, keep score, and climb the leaderboard.</p>
            <div className="ctas">
              <Link className="btn btn-solid" href="/leagues/">Join a League <svg aria-hidden="true"><use href="/icons/symbols.svg#i-arrow" /></svg></Link>
              <Link className="link" href="/how-it-works/">How it works</Link>
            </div>
            <div className="meta">
              <div>
                <svg className="meta-icon" aria-hidden="true"><use href="/icons/symbols.svg#i-calendar" /></svg>
                <strong>Flexible Games</strong>
                Play on your schedule
              </div>
              <div>
                <svg className="meta-icon" aria-hidden="true"><use href="/icons/symbols.svg#i-heart" /></svg>
                <strong>Friendly Tables</strong>
                Every level welcome
              </div>
              <div className="accent">
                <svg className="meta-icon" aria-hidden="true"><use href="/icons/symbols.svg#i-trophy" /></svg>
                <strong>Prizes</strong>
                For top finishers
              </div>
            </div>
          </div>
          <div className="hero-art">
            <div className="main" role="img" aria-label="Mahjong table set for a game, with a lamp and tile basket" style={{ backgroundImage: "url(/images/hero-table.jpg)" }} />
            <div className="stamp"><img src="/brand/mahjong-springs-badge-disc-pink.svg" width="138" height="138" alt="Mahjong Springs" /></div>
          </div>
        </div>
      </section>
      <div className="ms-ribbon">
        <div className="ms-wrap">
          <span>Designed by two friends</span>
          <svg aria-hidden="true"><use href="/icons/symbols.svg#i-heart" /></svg>
          <span>American mahjong, made beautiful</span>
          <svg aria-hidden="true"><use href="/icons/symbols.svg#i-heart" /></svg>
          <span>League play for every level</span>
          <svg aria-hidden="true"><use href="/icons/symbols.svg#i-heart" /></svg>
          <span>Est. 2026</span>
        </div>
      </div>
      <section className="ms-collection is-coming-soon">
        <div className="ms-wrap">
          <div className="sec-head">
            <div>
              <div className="eyebrow">Shop our tiles</div>
              <h2>Tile sets, <em>thoughtfully</em> designed</h2>
              <p className="note">Our first tile sets are in the works — stay tuned!</p>
            </div>
          </div>
          <div className="ms-soon-grid" role="list">
            {["ivory", "navy", "blush", "ivory2"].map((tone) => (
              <article key={tone} className={`ms-soon-card tone-${tone}`} role="listitem">
                <div className="ms-soon-face" aria-hidden="true"><span className="ms-soon-motif" /></div>
                <h3>Coming soon</h3>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="ms-play ms-league" id="join-a-league">
        <div className="ms-wrap">
          <div className="intro">
            <div className="eyebrow">The League</div>
            <h2>Join a <em>season</em></h2>
            <p>An eight-week season is an $80 entry fee, plus a $5 booking fee at checkout. Sign up, find a table near you, or host a game of your own. Official sessions are four games, scored for a running leaderboard.</p>
            <div className="league-ctas">
              <Link className="btn btn-solid" href="/leagues/">Join a League <svg aria-hidden="true"><use href="/icons/symbols.svg#i-arrow" /></svg></Link>
              <Link className="btn" href="/find-a-table/">Find a Table</Link>
            </div>
            <ul className="league-points">
              <li>Eight-week seasons</li>
              <li>$80 entry + $5 booking fee</li>
              <li>Host or find a table</li>
              <li>Live leaderboard</li>
            </ul>
            <div className="host">Have a table to share? <Link href="/host-a-game/">Host a game</Link></div>
          </div>
          <div className="sessions league-panel">
            {leagues.length === 0 ? <div className="empty">No leagues are open for sign-up yet.</div> : leagues.map((league) => {
              const date = when(league.startDate);
              const count = league.rosters.length;
              return (
                <div className="row" key={league.id}>
                  <div className="date"><div className="m">{date.m}</div><div className="d">{date.d}</div><div className="w">{date.w}</div></div>
                  <div>
                    <h3><Link href={`/league/${league.slug}/`}>{league.title}</Link></h3>
                    <div className="info">
                      <span><b>{league.status === "IN_PLAY" ? "In play" : league.status === "OPEN" ? "Open" : "Upcoming"}</b></span>
                      <span>{league.venueCity}, {league.venueState}</span>
                      <span>{formatUsd(league.entryFeeCents)} entry</span>
                      {league.isTestData ? <span className="pill test">Test data</span> : null}
                    </div>
                  </div>
                  <div className="seats">{count}{league.capacity ? ` / ${league.capacity}` : ""} players</div>
                  <Link className="btn" href={`/league/${league.slug}/`}>Details</Link>
                </div>
              );
            })}
            {leagues.some((league) => league.isTestData) ? <p className="note">Records marked Test data are local samples, not live league activity.</p> : null}
          </div>
        </div>
      </section>
      <section className="ms-areas" id="where-we-play">
        <div className="ms-wrap">
          <div className="ms-areas-head">
            <div>
              <div className="eyebrow">Where We Play</div>
              <h2>Saratoga Springs <em>&amp; nearby</em></h2>
            </div>
            <div className="ms-areas-copy">
              <p>Based in Saratoga Springs, Mahjong Springs runs eight-week American Mahjong leagues for an $80 entry fee. Players in our home city and from Lehi, American Fork, Eagle Mountain, Cedar Fort, Pleasant Grove, Highland, Alpine, Draper, Bluffdale, Vineyard, Orem, Lindon, Provo, Springville, Mapleton, Spanish Fork, Salem, Payson, and Santaquin are welcome. Any league player can host a four-person table, or find an open seat through Find a Table.</p>
            </div>
          </div>
          <div className="ms-areas-grid">
            {AREA_LIST.map((area) => (
              <article className="ms-area-card" key={area.slug}>
                <div className="kicker">{area.kicker}</div>
                <h3><Link href={`/${area.slug}/`}>{area.short_title}</Link></h3>
                <p>{area.card_summary}</p>
                <span className="more">Explore area</span>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="ms-story">
        <div className="ms-wrap">
          <div className="ph">
            <div className="a" role="img" aria-label="Lyndsey and Denise laughing over a game of mahjong" style={{ backgroundImage: "url(/images/founders-table-v2.jpg)" }} />
          </div>
          <div>
            <div className="eyebrow">Our Story</div>
            <h2>Two friends, one table,<br /><em>and a lot of jokers.</em></h2>
            <p>Mahjong Springs began the way the best things do: around a table with friends, a bowl of candy, and “just one more game.”</p>
            <p>We’re two friends who were always looking for a reason to get together. We fell for the click of the tiles and the laughter and conversation in between. Soon we wanted more than a game night. We wanted a community that always has room for one more, playing the same game we love with a dash of competition (and a few prizes) added in.</p>
            <div className="sig"><span className="s">Always room at our table.</span><span className="by">— Lyndsey &amp; Denise</span></div>
            <Link className="link" href="/our-story/">Read our story</Link>
          </div>
        </div>
      </section>
      <section className="ms-community" aria-label="Community">
        <div className="ms-wrap">
          <div className="q">
            <blockquote>Come for the mahjong, <em>stay for the friendships.</em></blockquote>
            <div className="handle">Join us on Instagram&nbsp;&nbsp;<a href="https://www.instagram.com/mahjongsprings/" target="_blank" rel="noopener">@mahjongsprings</a></div>
          </div>
        </div>
        <div className="igrid">
          {[
            ["/images/ig-tiles-felt.jpg", "Mahjong tiles on green felt"],
            ["/images/ig-tiles-mat.jpg", "An overhead view of white mahjong tiles with red and green faces"],
            ["/images/ig-library-rack.jpg", "A smiling woman holding a clear mahjong rack at a library table"],
            ["/images/ig-star-quilt.jpg", "Mahjong tiles shuffled on a green-and-white star quilt mat"],
            ["/images/ig-mahjong-bag.jpg", "A floral zip bag lettered Mahjong"],
            ["/images/ig-pink-drink.jpg", "A pink drink with a fig"],
          ].map(([src, alt]) => (
            <a key={src} href="https://www.instagram.com/mahjongsprings/" target="_blank" rel="noopener" role="img" aria-label={`${alt} (Instagram, opens in a new tab)`} style={{ backgroundImage: `url(${src})` }} />
          ))}
        </div>
      </section>
      <section className="ms-news" aria-labelledby="ms-news-title">
        <div className="ms-wrap">
          <div className="eyebrow">The Table Talk Letter</div>
          <h2 id="ms-news-title">New sets, league dates, <em>and a little love note.</em></h2>
          <p>Be the first to know when a collection drops or a seat opens up near you.</p>
          <form className="ms-news-form" action={subscribeNewsletter}>
            <input type="hidden" name="redirect" value="/" />
            <label className="hp" aria-hidden="true">Company website<input name="company_website" tabIndex={-1} autoComplete="off" /></label>
            <label className="screen-reader-text" htmlFor="ms-news-email">Your email address</label>
            <input className="field" id="ms-news-email" type="email" name="email" required placeholder="Your email address" />
            <button className="btn btn-pink" type="submit">Subscribe</button>
          </form>
          {news ? <div className="ms-news-msg" role="status">{news}</div> : null}
        </div>
      </section>
    </main>
  );
}
