import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { areaBySlug, AREA_LIST } from "@/lib/areas";
import { withCurrentFeePolicy } from "@/lib/constants";
import { areaJsonLd } from "@/lib/jsonld";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const area = areaBySlug((await params).slug);
  if (!area) return {};
  return { title: { absolute: area.seo_title }, description: area.seo_description };
}

export default async function AreaPage({ params }: Props) {
  const area = areaBySlug((await params).slug);
  if (!area) notFound();
  return (
    <main id="main" className="ms-area-main">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(areaJsonLd(area)) }} />
      <header className="page-hero">
        <div className="eyebrow">{area.eyebrow}</div>
        <h1>{area.h1}</h1>
        <p>{area.hero_intro}</p>
      </header>
      <div className="content-area"><div className="ms-wrap">
        <nav className="ms-area-crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/leagues/">Leagues</Link><span aria-hidden="true">/</span><span aria-current="page">{area.short_title}</span>
        </nav>
        <div className="ms-area-intro-grid">
          <div className="prose ms-area-copy">
            <h2>{area.lead_heading}</h2>
            {area.intro_paragraphs.map((paragraph) => <p key={paragraph}>{withCurrentFeePolicy(paragraph)}</p>)}
            <h3>{area.drive_heading}</h3>
            <p>{area.drive_body}</p>
            {area.local_paragraphs.map((paragraph) => <p key={paragraph}>{withCurrentFeePolicy(paragraph)}</p>)}
          </div>
          <aside className="ms-area-facts" aria-label="League details">
            <div className="eyebrow">Season Overview</div>
            <h3>{area.short_title}</h3>
            <dl>
              <div><dt>Format</dt><dd>8-week American Mahjong</dd></div>
              <div><dt>Entry fee</dt><dd>$80, plus a $5 booking fee</dd></div>
              <div><dt>Table size</dt><dd>4 players · 4 games/session</dd></div>
              <div><dt>Home base</dt><dd>Saratoga Springs, UT 84045</dd></div>
              <div><dt>Cities covered</dt><dd>{area.cities.join(", ")}</dd></div>
            </dl>
            <div className="ms-area-aside-actions">
              <Link className="btn btn-pink" href="/leagues/">View All Leagues</Link>
              <Link className="btn" href="/find-a-table/">Find a Table</Link>
            </div>
          </aside>
        </div>
        <section className="ms-area-faq" id="faq">
          <h2>Questions</h2>
          {area.faq.map((item) => (
            <details key={item.q} className="ms-area-faq">
              <summary>{item.q}</summary>
              <div><p>{withCurrentFeePolicy(item.a)}</p></div>
            </details>
          ))}
        </section>
        <p className="notice">Checkout adds a $5 booking fee to the entry fee. The booking fee is non-refundable. The organizer’s entry fee is refundable in full before the league starts.</p>
        <section className="ms-area-other">
          <span>Other areas</span>
          <ul>{AREA_LIST.filter((item) => item.slug !== area.slug).map((item) => <li key={item.slug}><Link href={`/${item.slug}/`}>{item.short_title}</Link></li>)}</ul>
        </section>
      </div></div>
    </main>
  );
}
