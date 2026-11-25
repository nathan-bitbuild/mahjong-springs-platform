import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { AREA_LIST } from "@/lib/areas";
import { formatUsd } from "@/lib/fees";
import { US_STATES } from "@/lib/utah";

export const metadata: Metadata = {
  title: "Mahjong Leagues in Saratoga Springs, UT",
  description: "Browse 8-week American Mahjong leagues in Saratoga Springs, Utah, and leagues hosted by approved organizers across the country. Entry fees are set by each organizer, plus a $5 booking fee.",
};

export default async function LeaguesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  const leagues = await prisma.league.findMany({
    where: {
      status: { in: ["UPCOMING", "OPEN", "IN_PLAY", "CLOSED"] },
      organization: { status: "APPROVED" },
      ...(query.state ? { venueState: query.state.toUpperCase() } : {}),
      ...(query.city ? { venueCity: { contains: query.city, mode: "insensitive" } } : {}),
      ...(query.zip ? { venueZip: { startsWith: query.zip } } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" } },
              { venueCity: { contains: query.q, mode: "insensitive" } },
              { venueState: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { rosters: { where: { status: "ACTIVE" } }, organization: true },
    orderBy: { startDate: "asc" },
  });
  const dated = query.from || query.to
    ? leagues.filter((league) => {
        const start = league.startDate.toISOString().slice(0, 10);
        if (query.from && start < query.from) return false;
        if (query.to && start > query.to) return false;
        return true;
      })
    : leagues;
  const openOnly = query.open === "1" ? dated.filter((league) => league.capacity === 0 || league.rosters.length < league.capacity) : dated;
  return (
    <main id="main">
      <header className="page-hero">
        <div className="eyebrow">Play</div>
        <h1>Leagues</h1>
        <p>Eight-week American Mahjong seasons. Mahjong Springs hosts Utah. Approved organizers host everywhere else and keep their entry fee.</p>
      </header>
      <div className="content-area"><div className="ms-wrap">
        <form className="form-grid" method="get" style={{ marginBottom: 36 }}>
          <div className="split">
            <label>City<input name="city" defaultValue={query.city || ""} /></label>
            <label>State
              <select name="state" defaultValue={query.state || ""}>
                <option value="">Any</option>
                {US_STATES.map((state) => <option key={state.code} value={state.code}>{state.name}</option>)}
              </select>
            </label>
          </div>
          <div className="split">
            <label>ZIP<input name="zip" defaultValue={query.zip || ""} /></label>
            <label>Search<input name="q" defaultValue={query.q || ""} /></label>
          </div>
          <div className="split">
            <label>From<input type="date" name="from" defaultValue={query.from || ""} /></label>
            <label>To<input type="date" name="to" defaultValue={query.to || ""} /></label>
          </div>
          <label><input type="checkbox" name="open" value="1" defaultChecked={query.open === "1"} /> Open spots only</label>
          <button className="btn btn-solid" type="submit">Find leagues</button>
        </form>
        <div className="sessions">
          {openOnly.length === 0 ? <div className="empty">No leagues match that search.</div> : openOnly.map((league) => (
            <div className="row" key={league.id}>
              <div className="date">
                <div className="m">{league.startDate.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}</div>
                <div className="d">{league.startDate.toLocaleDateString("en-US", { day: "2-digit", timeZone: "UTC" })}</div>
              </div>
              <div>
                <h3><Link href={`/league/${league.slug}/`}>{league.title}</Link> {league.isTestData ? <span className="pill test">Test data</span> : null}</h3>
                <div className="info">
                  <span>{league.venueCity}, {league.venueState} {league.venueZip}</span>
                  <span>{formatUsd(league.entryFeeCents)} entry + $5</span>
                  <span>{league.organization.name}</span>
                </div>
              </div>
              <div>{league.rosters.length}{league.capacity ? ` / ${league.capacity}` : ""} players</div>
              <Link className="btn" href={`/league/${league.slug}/`}>View</Link>
            </div>
          ))}
        </div>
        <section className="ms-areas-inline">
          <div className="ms-areas-inline-head">
            <div className="eyebrow">Where We Play</div>
            <h2>Saratoga Springs & nearby Utah County</h2>
          </div>
          <ul className="ms-areas-inline-list">
            {AREA_LIST.map((area) => (
              <li key={area.slug}><Link href={`/${area.slug}/`}><span>{area.short_title}</span></Link></li>
            ))}
          </ul>
        </section>
      </div></div>
    </main>
  );
}
