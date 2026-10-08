import Link from "next/link";
import { notFound } from "next/navigation";
import { HeroSlider } from "@/components/home/HeroSlider";
import { heroTheme } from "@/components/home/heroThemes";
import { DeliveryMapSection } from "@/components/map/DeliveryMapSection";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ChevronRightIcon } from "@/components/ui/icons";
import { hasLocale, localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { fileUrl, getBanners, getHomeProducts } from "@/lib/api";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, products, banners] = await Promise.all([getDictionary(lang), getHomeProducts(), getBanners()]);
  // Слайдҳо аз админ (матн бо забони ҷорӣ); агар набошанд — HeroSlider пешфарзро нишон медиҳад
  const slides = (banners ?? [])
    .filter((b) => b.image)
    .map((b) => ({
      id: String(b.id),
      image: fileUrl(b.image)!,
      href: b.href,
      ...heroTheme(b.theme),
      badge: b.badge[lang] || b.badge.tg,
      title: b.title[lang] || b.title.tg,
      text: b.text[lang] || b.text.tg,
      cta: b.cta[lang] || b.cta.tg,
    }));

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 pt-4 sm:gap-8 sm:px-6 sm:pt-6">
      <HeroSlider slides={slides} />

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

      {/* Харитаи расонидан — ноҳияи Рӯдакӣ */}
      <DeliveryMapSection />
    </main>
  );
}
