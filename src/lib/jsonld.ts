import { siteUrl, HOME_CITY, HOME_POSTAL, HOME_REGION, CONTACT_EMAIL, INSTAGRAM_URL, LEGAL_NAME, SITE_NAME } from "@/lib/constants";
import { SERVED_CITIES as CITIES } from "@/lib/areas";

export function organizationJsonLd() {
  const home = `${siteUrl()}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "LocalBusiness", "SportsActivityLocation"],
        "@id": `${home}#organization`,
        name: SITE_NAME,
        legalName: LEGAL_NAME,
        url: home,
        logo: `${siteUrl()}/brand/site-icon-512.png`,
        email: CONTACT_EMAIL,
        sameAs: [INSTAGRAM_URL],
        address: {
          "@type": "PostalAddress",
          addressLocality: HOME_CITY,
          addressRegion: HOME_REGION,
          postalCode: HOME_POSTAL,
          addressCountry: "US",
        },
        areaServed: CITIES.map((city) => ({
          "@type": "City",
          name: city,
          containedInPlace: { "@type": "State", name: "Utah" },
        })),
      },
      {
        "@type": "WebSite",
        "@id": `${home}#website`,
        name: SITE_NAME,
        url: home,
        publisher: { "@id": `${home}#organization` },
      },
    ],
  };
}

export function areaJsonLd(area: { slug: string; seo_title: string; seo_description: string; short_title: string; cities: string[] }) {
  const home = `${siteUrl()}/`;
  const url = `${siteUrl()}/${area.slug}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: area.seo_title,
        description: area.seo_description,
        inLanguage: "en-US",
        isPartOf: { "@id": `${home}#website` },
        about: {
          "@type": ["Organization", "LocalBusiness", "SportsActivityLocation"],
          "@id": `${home}#organization`,
          name: SITE_NAME,
          url: home,
          areaServed: area.cities.map((city) => ({ "@type": "City", name: city, containedInPlace: { "@type": "State", name: "Utah" } })),
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: home },
          { "@type": "ListItem", position: 2, name: "Leagues", item: `${siteUrl()}/leagues/` },
          { "@type": "ListItem", position: 3, name: area.short_title, item: url },
        ],
      },
    ],
  };
}

export function leagueEventJsonLd(league: {
  title: string;
  slug: string;
  description: string;
  startDate: Date;
  endDate: Date;
  entryFeeCents: number;
  venueCity: string;
  venueState: string;
  venueZip: string;
  status: string;
}) {
  const url = `${siteUrl()}/league/${league.slug}/`;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: league.title,
    description: league.description || `${league.title} is an American Mahjong league in ${league.venueCity}, ${league.venueState}. Entry is $${(league.entryFeeCents / 100).toFixed(0)}.`,
    url,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    startDate: league.startDate.toISOString().slice(0, 10),
    endDate: league.endDate.toISOString().slice(0, 10),
    image: `${siteUrl()}/images/hero-table.jpg`,
    location: {
      "@type": "Place",
      name: `${league.venueCity}, ${league.venueState}`,
      address: {
        "@type": "PostalAddress",
        addressLocality: league.venueCity,
        addressRegion: league.venueState,
        postalCode: league.venueZip || undefined,
        addressCountry: "US",
      },
    },
    organizer: { "@type": "Organization", name: SITE_NAME, url: `${siteUrl()}/` },
    offers: {
      "@type": "Offer",
      price: (league.entryFeeCents / 100).toFixed(2),
      priceCurrency: "USD",
      url,
      availability: league.status === "UPCOMING" ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
    },
  };
}
