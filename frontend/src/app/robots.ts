import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/** robots.txt: ҳама саҳифаҳо барои Google, ба ғайр аз саҳифаҳои шахсӣ ва ҷустуҷӯ. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/backend/", "/*/cart", "/*/profile", "/*/favorites", "/*/search"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
