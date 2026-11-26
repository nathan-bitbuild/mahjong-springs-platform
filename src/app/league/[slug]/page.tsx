import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatUsd, BOOKING_FEE_CENTS } from "@/lib/fees";
import { beginCheckout } from "@/server/actions";
import { leagueEventJsonLd } from "@/lib/jsonld";
import { LEAGUE_STATUS_LABEL } from "@/lib/constants";
import { paymentsReady } from "@/server/payments";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const league = await prisma.league.findUnique({ where: { slug } });
  if (!league) return { title: "League" };
  return {
    title: `${league.title}: 8-Week Mahjong League in ${league.venueCity}, ${league.venueState}`,
    description: `Join ${league.title}, an American Mahjong league in ${league.venueCity}, ${league.venueState}. Entry is ${formatUsd(league.entryFeeCents)}, plus a $5 booking fee.`,
    robots: league.status === "CLOSED" ? { index: false } : undefined,
  };
}

export default async function LeaguePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const session = await auth();
  const league = await prisma.league.findUnique({
    where: { slug },
    include: {
      organization: true,
      rosters: { where: { status: "ACTIVE" }, include: { user: true } },
    },
  });
  if (!league || league.status === "DRAFT" || league.organization.status !== "APPROVED") {
    notFound();
  }
  const mine = league.rosters.find((roster) => roster.userId === session?.user?.id);
  const open = ["OPEN", "IN_PLAY"].includes(league.status);
  const full = league.capacity > 0 && league.rosters.length >= league.capacity;
  const ready = paymentsReady(league.organization.cardPaymentsStatus);
  return (
    <main id="main">
      {league.status !== "CLOSED" ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(leagueEventJsonLd(league)) }} /> : null}
      <header className="page-hero">
        <div className="eyebrow">{league.venueCity}, {league.venueState}</div>
        <h1>{league.title}</h1>
        <p>{league.startDate.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })} – {league.endDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })} · {LEAGUE_STATUS_LABEL[league.status]}</p>
      </header>
      <div className="content-area"><div className="ms-wrap prose" style={{ display: "grid", gridTemplateColumns: "1.3fr .7fr", gap: 48 }}>
        <div>
          {query.error ? <p className="notice error">{query.error}</p> : null}
          {query.waitlist ? <p className="notice">This season is full. You’re on the waitlist, and you have not been charged.</p> : null}
          {query.saved ? <p className="notice ok">You’re on the roster.</p> : null}
          {league.isTestData ? <p className="notice">Test data. This season is a local sample, not a live Mahjong Springs league.</p> : null}
          <p>{league.description || `${league.organization.name} is hosting this American Mahjong season in ${league.venueCity}, ${league.venueState}.`}</p>
          <h2>Roster</h2>
          {league.rosters.length === 0 ? <p>No players have registered yet.</p> : (
            <ul>{league.rosters.map((roster) => <li key={roster.id}>{roster.user.displayName || roster.user.name}{roster.source === "COMP" ? " · comp" : ""}</li>)}</ul>
          )}
          <p><Link href={`/leaderboard/?league=${league.slug}`}>Season awards</Link> · <Link href={`/find-a-table/?league=${league.slug}`}>Find a table</Link></p>
        </div>
        <aside className="panel">
          <div className="eyebrow">Register</div>
          <div className="fee-box">
            <div><span>Entry fee</span><b>{formatUsd(league.entryFeeCents)}</b></div>
            <div><span>Booking fee</span><b>{formatUsd(BOOKING_FEE_CENTS)}</b></div>
            <div className="total"><span>Total</span><span>{formatUsd(league.entryFeeCents + BOOKING_FEE_CENTS)}</span></div>
          </div>
          <p>The organizer keeps the entry fee. The $5 booking fee is non-refundable. Entry-fee refunds, if any, are issued by the organizer.</p>
          <p>{league.rosters.length}{league.capacity ? ` / ${league.capacity}` : ""} players · Hosted by {league.organization.name}</p>
          {!ready ? <p>Checkout opens when this organizer finishes Stripe setup.</p> : null}
          {mine ? <p>You’re registered.</p> : open && ready ? (
            <form action={beginCheckout}>
              <input type="hidden" name="slug" value={league.slug} />
              <button className="btn btn-pink" type="submit">{full ? "Join the waitlist" : "Continue to checkout"}</button>
            </form>
          ) : <p>Sign-up is not open.</p>}
          {!session?.user ? <p><Link href={`/login/?callbackUrl=/league/${league.slug}/`}>Sign in</Link> to register.</p> : null}
        </aside>
      </div></div>
    </main>
  );
}
