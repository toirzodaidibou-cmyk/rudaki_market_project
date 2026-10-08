// Маълумот аз backend (RudakiMarket.Api). Танҳо дар server истифода мешавад.
import type { Locale } from "@/i18n/config";

const API_URL = process.env.API_URL ?? "http://localhost:5080";

export type Category = {
  slug: string;
  name: Record<Locale, string>;
  icon: string | null;
  /** Шумораи молҳои фаъол (0 — дар каталог пинҳон) */
  productCount: number;
};

export type Product = {
  id: number;
  name: Record<Locale, string>;
  price: number;
  oldPrice: number | null;
  sizeLabel: string | null;
  isNew: boolean;
  /** То 3 сурати хурд (480px) барои корт */
  images: string[];
};

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

/** Роҳи нисбии файл ("/uploads/...") → URL-и пурра. */
// Суроғаи суратҳо барои браузер: NEXT_PUBLIC_API_URL (масалан "/backend"), вагарна API_URL
const PUBLIC_URL = process.env.NEXT_PUBLIC_API_URL || API_URL;
export const fileUrl = (path: string | null) => (path ? `${PUBLIC_URL}${path}` : null);

/**
 * Кэш 30 сония: тағйирот дар админ дар сайт пас аз ~30 сония пайдо мешавад,
 * бе он ки ҳар дархост ба база равад. Агар backend дастрас набошад — null.
 */
async function get<T>(path: string, tags: string[]): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 30, tags } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Категорияҳои фаъол. */
export const getCategories = () => get<Category[]>("/api/categories", ["categories"]);

export const PRODUCTS_PAGE_SIZE = 24;

export const SORTS = ["new", "cheap", "expensive", "discount"] as const;
export type Sort = (typeof SORTS)[number];

/** Ҷустуҷӯ, тартиб ва нарх аз URL (?q=&sort=&min=&max=). */
export type ListOptions = { q?: string; sort?: Sort; min?: number; max?: number };

/**
 * Молҳои фаъол, саҳифа ба саҳифа. categorySlug = null — аз ҳамаи категорияҳо.
 * Бе тартиб: каталог — навтаринҳо, ҷустуҷӯ — мувофиқтарин.
 * null — категория нест ё backend дастрас нест.
 */
export function getProducts(categorySlug: string | null, page: number, opts: ListOptions = {}) {
  const params = new URLSearchParams();
  if (categorySlug) params.set("category", categorySlug);
  if (opts.q) params.set("q", opts.q);
  if (opts.sort) params.set("sort", opts.sort);
  if (opts.min) params.set("min", String(opts.min));
  if (opts.max) params.set("max", String(opts.max));
  params.set("page", String(page));
  params.set("pageSize", String(PRODUCTS_PAGE_SIZE));
  return get<Paged<Product>>(`/api/products?${params}`, ["products", `products:${categorySlug ?? "all"}`]);
}

export type ProductImage = { id: number; url: string; thumb: string };

export type ProductDetail = Omit<Product, "images"> & {
  description: Record<Locale, string>;
  images: ProductImage[];
  category: { slug: string; name: Record<Locale, string> };
  similar: Product[];
};

/** Саҳифаи мол. null — мол нест/пинҳон ё backend дастрас нест. */
export const getProduct = (id: number) => get<ProductDetail>(`/api/products/${id}`, ["products", `product:${id}`]);

/** Саҳифаи асосӣ: то 20 мол — аксиядорҳо аввал, баъд навтаринҳо (боқимонда — дар каталог). */
export const getHomeProducts = () => get<Product[]>("/api/products/home", ["products", "products:home"]);

export type Bundle = {
  id: number;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  emoji: string;
  total: number;
  itemCount: number;
  /** То 4 сурати хурди молҳо */
  images: string[];
};

export type BundleDetail = Omit<Bundle, "itemCount" | "images"> & { items: { product: Product; quantity: number }[] };

/** Маҷмӯаҳои фаъол ("Дастархони чой", ...). */
export const getBundles = () => get<Bundle[]>("/api/bundles", ["bundles", "products"]);

export const getBundle = (id: number) => get<BundleDetail>(`/api/bundles/${id}`, ["bundles", "products"]);

export type Banner = {
  id: number;
  badge: Record<Locale, string>;
  title: Record<Locale, string>;
  text: Record<Locale, string>;
  cta: Record<Locale, string>;
  href: string;
  theme: string;
  image: string | null;
};

/** Слайдҳои саҳифаи асосӣ (аз админ). */
export const getBanners = () => get<Banner[]>("/api/banners", ["banners"]);
