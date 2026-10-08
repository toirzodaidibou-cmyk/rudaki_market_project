import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/getDictionary";
import { fileUrl, PRODUCTS_PAGE_SIZE } from "@/lib/api";
import type { Paged, Product } from "@/lib/api";

/** Шабакаи кортҳои мол + саҳифабандӣ. Дар саҳифаи асосӣ ва саҳифаи категория. */
export function ProductGrid({
  lang,
  dict,
  products,
  pageHref,
}: {
  lang: Locale;
  dict: Dictionary;
  products: Paged<Product>;
  /** Суроғаи саҳифаи n (масалан "/tg?page=2") */
  pageHref: (page: number) => string;
}) {
  const t = dict.product;
  const page = products.page;
  const pages = Math.max(1, Math.ceil(products.total / PRODUCTS_PAGE_SIZE));

  return (
    <>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5">
        {products.items.map((p, i) => (
          <li key={p.id}>
            <ProductCard
              priority={i < 4}
              product={{
                id: p.id,
                name: p.name[lang] || p.name.tg,
                price: p.price,
                oldPrice: p.oldPrice,
                sizeLabel: p.sizeLabel,
                isNew: p.isNew,
                images: p.images.map((src) => fileUrl(src)!),
              }}
            />
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
          {page > 1 && (
            <Link
              href={pageHref(page - 1)}
              className="flex h-11 items-center gap-1 rounded-xl bg-surface px-4 font-medium hover:bg-surface-hover"
            >
              <ChevronLeftIcon width={18} height={18} /> {t.prev}
            </Link>
          )}
          <span className="px-2 text-sm text-muted tabular-nums">
            {page} / {pages}
          </span>
          {page < pages && (
            <Link
              href={pageHref(page + 1)}
              className="flex h-11 items-center gap-1 rounded-xl bg-surface px-4 font-medium hover:bg-surface-hover"
            >
              {t.next} <ChevronRightIcon width={18} height={18} />
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
