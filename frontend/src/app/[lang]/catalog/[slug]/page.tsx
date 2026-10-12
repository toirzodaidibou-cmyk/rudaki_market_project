import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListToolbar } from "@/components/product/ListToolbar";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { format, hasLocale, localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { getCategories, getProducts } from "@/lib/api";
import { listHref, parseListParams } from "@/lib/listParams";
import { alternates } from "@/lib/seo";

type Props = PageProps<"/[lang]/catalog/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const category = (await getCategories())?.find((c) => c.slug === slug);
  if (!category) return {};
  const name = category.name[lang] || category.name.tg;
  return {
    title: `${name} — RUDAKI MARKET`,
    description: `${name} — ${(await getDictionary(lang)).info.tagline}`,
    alternates: alternates(lang, `/catalog/${slug}`),
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) notFound();
  // Тартиб ва нарх аз URL (?sort=cheap&min=10&max=50) — ҷустуҷӯ дар каталог дар саҳифаи /search аст
  const { page, opts } = parseListParams(await searchParams);
  const filters = { ...opts, q: undefined };

  const [dict, categories, products] = await Promise.all([
    getDictionary(lang),
    getCategories(),
    getProducts(slug, page, filters),
  ]);
  const category = categories?.find((c) => c.slug === slug);
  if (!category || !products) notFound();

  const t = dict.product;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 sm:px-6 sm:pt-6">
      <Link
        href={localizePath(lang, "/catalog")}
        className="mb-1 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon width={16} height={16} />
        {t.back}
      </Link>
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {category.name[lang] || category.name.tg}
        </h1>
        <span className="shrink-0 text-sm text-muted">{format(t.count, { n: String(products.total) })}</span>
      </div>

      <ListToolbar opts={filters} />

      {products.items.length === 0 ? (
        <p className="py-16 text-center text-muted">{t.empty}</p>
      ) : (
        <ProductGrid
          lang={lang}
          dict={dict}
          products={products}
          pageHref={(p) => listHref(localizePath(lang, `/catalog/${slug}`), filters, p)}
        />
      )}
    </main>
  );
}
