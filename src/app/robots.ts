import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account/", "/my-league/", "/my-profile/", "/directory/", "/organizer/", "/admin/", "/login/", "/signup/", "/api/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
