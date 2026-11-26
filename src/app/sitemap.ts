import type { MetadataRoute } from "next";
import { AREA_LIST } from "@/lib/areas";
import { siteUrl } from "@/lib/constants";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticPaths = ["", "/leagues/", "/find-a-table/", "/how-it-works/", "/leaderboard/", "/host-a-game/", "/our-story/", "/contact/", "/privacy-policy/", "/terms/"];
  let leagues: { slug: string; updatedAt: Date }[] = [];
  try {
    leagues = await prisma.league.findMany({
      where: { status: { in: ["UPCOMING", "OPEN", "IN_PLAY"] }, organization: { status: "APPROVED" } },
      select: { slug: true, updatedAt: true },
    });
  } catch {
    leagues = [];
  }
  return [
    ...staticPaths.map((path) => ({ url: `${base}${path || "/"}` })),
    ...AREA_LIST.map((area) => ({ url: `${base}/${area.slug}/` })),
    ...leagues.map((league) => ({ url: `${base}/league/${league.slug}/`, lastModified: league.updatedAt })),
  ];
}
