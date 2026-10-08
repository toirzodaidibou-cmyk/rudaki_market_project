import Link from "next/link";
import { notFound } from "next/navigation";
import { BundleCard } from "@/components/bundle/BundleCard";
import { HeroSlider } from "@/components/home/HeroSlider";
import { DeliveryMapSection } from "@/components/map/DeliveryMapSection";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ChevronRightIcon } from "@/components/ui/icons";
import { hasLocale, localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { getBundles, getHomeProducts } from "@/lib/api";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, products, bundles] = await Promise.all([getDictionary(lang), getHomeProducts(), getBundles()]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pt-4 sm:gap-8 sm:px-6 sm:pt-6">
      <HeroSlider />

      {/* Танҳо 20 мол: аксиядорҳо аввал, баъд навтаринҳо. Ҳамаи дигар — дар каталог */}
      {products && products.length > 0 && (
        <section aria-labelledby="home-products">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 id="home-products" className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              {dict.home.title}
            </h2>
            <Link
              href={localizePath(lang, "/catalog")}
              className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-muted hover:text-foreground"
            >
              {dict.home.allProducts} <ChevronRightIcon width={16} height={16} />
            </Link>
          </div>
          <ProductGrid
            lang={lang}
            dict={dict}
            products={{ items: products, total: products.length, page: 1, pageSize: products.length }}
            pageHref={() => localizePath(lang, "/")}
          />
          <Link
            href={localizePath(lang, "/catalog")}
            className="mx-auto mt-8 flex h-12 w-full max-w-sm items-center justify-center gap-1 rounded-2xl bg-surface font-semibold text-foreground hover:bg-surface-hover"
          >
            {dict.home.allProducts} <ChevronRightIcon width={18} height={18} />
          </Link>
        </section>
      )}

      {/* Маҷмӯаҳо: "Дастархони чой", ... — ҳама бо як тугма ба сабад */}
      {bundles && bundles.length > 0 && (
        <section aria-labelledby="bundles">
          <h2 id="bundles" className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
            {dict.bundles.title}
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted">{dict.bundles.subtitle}</p>
          <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
            {bundles.map((b, i) => (
              <li key={b.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
                <BundleCard bundle={b} index={i} lang={lang} dict={dict} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Харитаи расонидан — ноҳияи Рӯдакӣ */}
      <DeliveryMapSection />
    </main>
  );
}
