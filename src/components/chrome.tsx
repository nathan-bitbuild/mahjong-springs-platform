"use client";

import Link from "next/link";
import { useState } from "react";
import { logout } from "@/server/actions";

const NAV = [
  { href: "/leagues/", label: "Leagues" },
  { href: "/find-a-table/", label: "Find a Table" },
  { href: "/how-it-works/", label: "How it Works" },
  { href: "/our-story/", label: "Our Story" },
];

export function SiteHeader({
  user,
}: {
  user: { name: string; role: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const accountHref = user?.role === "ADMIN" ? "/admin/" : user?.role === "ORGANIZER" ? "/organizer/" : "/account/";
  return (
    <>
      <div className="ms-announce" role="region" aria-label="Announcements">
        <Link className="ms-announce-link" href="/leagues/">
          <span>8-week American Mahjong leagues</span>
          <i aria-hidden="true" />
          <span>
            Prizes for <b>top finishers</b>
          </span>
        </Link>
      </div>
      <header className="site-header" id="masthead">
        <div className="ms-wrap">
          <Link className="brand" href="/" aria-label="Mahjong Springs home">
            <img className="lockup" src="/brand/mahjong-springs-lockup.svg" alt="Mahjong Springs" />
          </Link>
          <nav className="navl" aria-label="Primary">
            <ul className="menu">
              {NAV.map((item) => (
                <li key={item.href} className="menu-item">
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="navr">
            <button className="search-toggle" type="button" aria-expanded={search} onClick={() => setSearch((v) => !v)}>
              <svg aria-hidden="true"><use href="/icons/symbols.svg#i-search" /></svg>
              <span className="screen-reader-text">Search</span>
            </button>
            <Link className="account" href={user ? accountHref : "/login/"}>
              <svg aria-hidden="true"><use href="/icons/symbols.svg#i-user" /></svg>
              <span className="screen-reader-text">{user ? user.name : "Sign in"}</span>
            </Link>
            <button className="menu-toggle" type="button" aria-expanded={open} onClick={() => setOpen(true)}>
              <svg aria-hidden="true"><use href="/icons/symbols.svg#i-menu" /></svg>
              <span className="screen-reader-text">Menu</span>
            </button>
          </div>
        </div>
        {search ? (
          <div className="ms-search-panel is-open" id="ms-search-panel">
            <div className="ms-wrap">
              <form className="search-form" action="/leagues/" method="get">
                <label>
                  <span className="screen-reader-text">Search leagues</span>
                  <input className="search-field" name="q" placeholder="City, state, or league" />
                </label>
                <button className="search-submit" type="submit">Search</button>
              </form>
            </div>
          </div>
        ) : null}
      </header>
      <div className={`mobile-nav${open ? " is-open" : ""}`} aria-hidden={!open}>
        <div className="scrim" onClick={() => setOpen(false)} />
        <div className="panel" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="panel-head">
            <img src="/brand/mahjong-springs-badge.svg" width="56" height="56" alt="" />
            <button className="menu-close" type="button" onClick={() => setOpen(false)}>
              <svg aria-hidden="true"><use href="/icons/symbols.svg#i-close" /></svg>
              <span className="screen-reader-text">Close menu</span>
            </button>
          </div>
          <ul>
            {NAV.map((item) => (
              <li key={item.href}><Link href={item.href} onClick={() => setOpen(false)}>{item.label}</Link></li>
            ))}
            <li><Link href="/leaderboard/" onClick={() => setOpen(false)}>Leaderboard</Link></li>
            <li><Link href={user ? accountHref : "/login/"} onClick={() => setOpen(false)}>{user ? "Account" : "Sign in"}</Link></li>
          </ul>
        </div>
      </div>
    </>
  );
}

export function SiteFooter() {
  const areas = [
    ["Saratoga Springs", "/mahjong-saratoga-springs/"],
    ["Lehi & American Fork", "/mahjong-lehi-american-fork/"],
    ["Eagle Mountain & Cedar Fort", "/mahjong-eagle-mountain/"],
    ["Draper & Bluffdale", "/mahjong-draper-bluffdale/"],
    ["Highland, Alpine & Pleasant Grove", "/mahjong-highland-alpine-pleasant-grove/"],
    ["Vineyard, Orem & Lindon", "/mahjong-vineyard-orem-lindon/"],
    ["Provo", "/mahjong-provo/"],
    ["Springville & Mapleton", "/mahjong-springville-mapleton/"],
    ["Spanish Fork & Salem", "/mahjong-spanish-fork-salem/"],
    ["Payson & Santaquin", "/mahjong-payson-santaquin/"],
  ];
  return (
    <footer className="site-footer" id="colophon">
      <div className="ms-wrap">
        <div className="top">
          <div>
            <Link className="fb" href="/">
              <span className="disc"><img src="/brand/mahjong-springs-badge.svg" width="80" height="80" alt="" /></span>
              <span className="wm">Mahjong<br />Springs</span>
            </Link>
            <p className="tag">Always room at our table. Eight-week leagues, made by two friends.</p>
          </div>
          <nav aria-label="Shop links">
            <h2>Shop</h2>
            <ul>
              <li><a href="https://www.instagram.com/mahjongsprings/" target="_blank" rel="noopener">Tile sets, coming soon</a></li>
            </ul>
          </nav>
          <nav aria-label="Play links">
            <h2>Play</h2>
            <ul>
              <li><Link href="/leagues/">Leagues</Link></li>
              <li><Link href="/find-a-table/">Find a Table</Link></li>
              <li><Link href="/host-a-game/">Host a Game</Link></li>
              <li><Link href="/leaderboard/">Leaderboard</Link></li>
            </ul>
          </nav>
          <nav aria-label="Help links">
            <h2>Help</h2>
            <ul>
              <li><Link href="/how-it-works/">How it Works</Link></li>
              <li><Link href="/contact/">Contact</Link></li>
              <li><Link href="/organizer/">Host a league</Link></li>
            </ul>
          </nav>
          <div>
            <h2>Follow Along</h2>
            <div className="social">
              <a href="https://www.instagram.com/mahjongsprings/" target="_blank" rel="noopener">
                <svg aria-hidden="true"><use href="/icons/symbols.svg#i-ig" /></svg>
                <span className="screen-reader-text">Instagram (opens in a new tab)</span>
              </a>
            </div>
            <ul><li><a href="https://www.instagram.com/mahjongsprings/">@mahjongsprings</a></li></ul>
            {userLogout()}
          </div>
        </div>
        <nav className="areas" aria-label="Areas we serve">
          <h2>Areas We Serve</h2>
          <ul>
            {areas.map(([label, href]) => (
              <li key={href}><Link href={href}>{label}</Link></li>
            ))}
          </ul>
        </nav>
        <div className="bot">
          <span>© {new Date().getFullYear()} Mahjong Springs · mahjongsprings.com</span>
          <em>Come for the mahjong, stay for the friendships.</em>
          <span className="legal">
            <Link href="/privacy-policy/">Privacy</Link> · <Link href="/terms/">Terms</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

function userLogout() {
  return (
    <form action={logout} style={{ marginTop: 18 }}>
      <button className="link" type="submit" style={{ background: "none", border: 0, color: "inherit", cursor: "pointer" }}>
        Sign out
      </button>
    </form>
  );
}
