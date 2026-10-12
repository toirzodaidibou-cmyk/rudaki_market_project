import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { getCategories } from "@/lib/api";
import { localeUrl, SITE_URL } from "@/lib/seo";

const API_URL = process.env.API_URL ?? "http://localhost:5080";

/** Ҳар соат нав мешавад (моли нав дар Google дертар аз 1 соат пайдо мешавад). */
export const revalidate = 3600;

type SitemapProduct = { id: number; updatedAt: string };

async function getSitemapProducts(): Promise<SitemapProduct[]> {
  try {
    const res = await fetch(`${API_URL}/api/products/sitemap`, { next: { revalidate: 3600, tags: ["products"] } });
    return res.ok ? ((await res.json()) as SitemapProduct[]) : [];
  } catch {
    return [];
  }
}

/** Ҳар саҳифа бо 4 забон (hreflang дар дохили sitemap). */
function entry(path: string, priority: number, lastModified?: string): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}${localeUrl("tg", path)}`,
    lastModified,
    changeFrequency: "daily",
    priority,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}${localeUrl(l, path)}`])) },
  };
}

/**
 * sitemap.xml: саҳифаҳои асосӣ, категорияҳои дорои мол ва молҳои фаъол (то 12 000 — ҳадди як sitemap бо 4 забон).
 * Забонҳои дигар ҳамчун hreflang-и ҳамон сатр.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([getCategories(), getSitemapProducts()]);
  return [
    entry("/", 1),
    entry("/catalog", 0.9),
    ...(categories ?? []).filter((c) => (c.productCount ?? 1) > 0).map((c) => entry(`/catalog/${c.slug}`, 0.8)),
    ...products.map((p) => entry(`/product/${p.id}`, 0.6, p.updatedAt)),
    entry("/delivery", 0.4),
    entry("/contacts", 0.4),
    entry("/about", 0.3),
  ];
}
