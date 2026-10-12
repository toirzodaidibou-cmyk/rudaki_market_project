// SEO: суроғаи сайт, canonical + hreflang (4 забон) ва JSON-LD (schema.org).
import type { Metadata } from "next";
import { locales } from "@/i18n/config";
import type { Locale } from "@/i18n/config";

/** Суроғаи асосии сайт (барои пайвандҳои пурра: sitemap, og:image, canonical). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://rudaki-market.vercel.app").replace(/\/+$/, "");

/** Роҳи саҳифа бе забон ("/catalog") → "/tg/catalog"; "/" → "/tg". */
export const localeUrl = (lang: Locale, path: string) => `/${lang}${path === "/" ? "" : path}`;

/**
 * canonical — ҳамин забон; hreflang — ҳар 4 забон ва x-default (тоҷикӣ).
 * Google мефаҳмад, ки /tg, /ru, /en, /uz як саҳифа бо забонҳои гуногун ҳастанд.
 */
export function alternates(lang: Locale, path: string): Metadata["alternates"] {
  return {
    canonical: localeUrl(lang, path),
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, localeUrl(l, path)])),
      "x-default": localeUrl("tg", path),
    },
  };
}

/** Матни JSON-LD барои <script type="application/ld+json"> (бе хатари "</script>"). */
export const jsonLd = (data: object) => JSON.stringify(data).replace(/</g, "\\u003c");
