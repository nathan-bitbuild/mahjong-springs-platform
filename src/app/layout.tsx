import type { Metadata } from "next";
import { Cormorant_Garamond, Jost, Pinyon_Script } from "next/font/google";
import Script from "next/script";
import { auth } from "@/auth";
import { SiteFooter, SiteHeader } from "@/components/chrome";
import { gaMeasurementId } from "@/lib/constants";
import "./globals.css";

const jost = Jost({ subsets: ["latin"], weight: ["300", "400", "500", "600"], variable: "--font-jost" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});
const pinyon = Pinyon_Script({ subsets: ["latin"], weight: "400", variable: "--font-pinyon" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.mahjongsprings.com"),
  title: { default: "Mahjong Leagues in Saratoga Springs, Utah | Mahjong Springs", template: "%s | Mahjong Springs" },
  description: "Join 8-week American Mahjong leagues in Saratoga Springs, Utah. Seasons are an $80 entry fee and welcome players from Lehi, Eagle Mountain, and nearby Utah County.",
  openGraph: {
    siteName: "Mahjong Springs",
    type: "website",
    images: [{ url: "/images/hero-table.jpg", alt: "Mahjong table set for a game, with a lamp and tile basket" }],
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const ga = gaMeasurementId();
  const gaOk = /^G-[A-Z0-9]+$/.test(ga);
  return (
    <html lang="en-US">
      <body className={`${jost.variable} ${cormorant.variable} ${pinyon.variable}`}>
        <a className="skip-link screen-reader-text" href="#main">Skip to content</a>
        <SiteHeader user={session?.user ? { name: session.user.name || "Account", role: session.user.role } : null} />
        {children}
        <SiteFooter />
        {gaOk ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
