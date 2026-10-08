import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListToolbar } from "@/components/product/ListToolbar";
import { ProductGrid } from "@/components/product/ProductGrid";
import { SearchIcon } from "@/components/ui/icons";
import { format, hasLocale, localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { getProducts } from "@/lib/api";
import { listHref, parseListParams } from "@/lib/listParams";

type Props = PageProps<"/[lang]/search">;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  const { opts } = parseListParams(await searchParams);
  return {
    title: `${opts.q ? `${opts.q} — ` : ""}${dict.search.title} — RUDAKI MARKET`,
    robots: { index: false }, // натиҷаҳои ҷустуҷӯ дар Google лозим нестанд
  };
}

/** Натиҷаҳои ҷустуҷӯ: /tg/search?q=чой (+ тартиб ва нарх). */
export default async function SearchPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const { page, opts } = parseListParams(await searchParams);
  const dict = await getDictionary(lang);
  const t = dict.search;
  const products = opts.q ? await getProducts(null, page, opts) : null;
  const base = localizePath(lang, "/search");

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 sm:px-6 sm:pt-6">
      {!opts.q ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center text-muted">
          <SearchIcon width={40} height={40} />
          <p>{t.prompt}</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <h1 className="text-2xl font-extrabold tracking-tight break-words text-foreground sm:text-3xl">
              {format(t.resultsFor, { q: opts.q })}
            </h1>
            {products && products.total > 0 && (
              <p className="mt-1 text-sm text-muted">{format(t.found, { n: String(products.total) })}</p>
            )}
          </div>
          <ListToolbar opts={opts} relevance />
          {!products || products.items.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-lg font-semibold text-foreground">{format(t.notFound, { q: opts.q })}</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{t.notFoundHint}</p>
            </div>
          ) : (
            <ProductGrid lang={lang} dict={dict} products={products} pageHref={(p) => listHref(base, opts, p)} />
          )}
        </>
      )}
    </main>
  );
}
