// Параметрҳои рӯйхат дар URL: ?q=&sort=&min=&max=&page= (каталог ва ҷустуҷӯ).
import { SORTS } from "@/lib/api";
import type { ListOptions, Sort } from "@/lib/api";

type SearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const positive = (v: string | undefined) => {
  const n = v ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10_000_000) : undefined;
};

export function parseListParams(sp: SearchParams): { page: number; opts: ListOptions } {
  const sort = one(sp.sort);
  return {
    page: Math.max(1, Number.parseInt(one(sp.page) ?? "1", 10) || 1),
    opts: {
      q: one(sp.q)?.slice(0, 100),
      sort: SORTS.includes(sort as Sort) ? (sort as Sort) : undefined,
      min: positive(one(sp.min)),
      max: positive(one(sp.max)),
    },
  };
}

/** "/tg/search" + { q: "чой", sort: "cheap" } + 2 → "/tg/search?q=чой&sort=cheap&page=2" */
export function listHref(base: string, opts: ListOptions, page = 1): string {
  const p = new URLSearchParams();
  if (opts.q) p.set("q", opts.q);
  if (opts.sort) p.set("sort", opts.sort);
  if (opts.min) p.set("min", String(opts.min));
  if (opts.max) p.set("max", String(opts.max));
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}
