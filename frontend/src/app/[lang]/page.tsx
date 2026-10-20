import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BundleCard } from "@/components/bundle/BundleCard";
import { HeroSlider } from "@/components/home/HeroSlider";
import { DeliveryEta, HomeCategories } from "@/components/home/HomeExtras";
import { heroTheme } from "@/components/home/heroThemes";
import { DeliveryMapSection } from "@/components/map/DeliveryMapSection";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ChevronRightIcon } from "@/components/ui/icons";
import { hasLocale, localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { fileUrl, getBanners, getBundles, getCategories, getHomeProducts } from "@/lib/api";
import { STORE_CONTACT } from "@/config/store";
import { alternates, jsonLd, localeUrl, SITE_URL } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  return { alternates: alternates(lang, "/") };
}

/**
 * JSON-LD: мағоза (OnlineStore — телефон, соатҳо, ноҳия) ва WebSite бо ҷустуҷӯ
 * (Google метавонад сатри ҷустуҷӯи сайтро дар натиҷаҳо нишон диҳад).
 */
function homeJsonLd(lang: Locale, description: string) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      name: "RUDAKI MARKET",
      url: `${SITE_URL}${localeUrl(lang, "/")}`,
      logo: `${SITE_URL}/icons/icon-512.png`,
      description,
      telephone: STORE_CONTACT.phone.replace(/\s/g, ""),
      areaServed: "Rudaki District, Tajikistan",
      currenciesAccepted: "TJS",
      paymentAccepted: "Cash, Alif, Dushanbe City, Korti Milli",
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: STORE_CONTACT.open,
        closes: STORE_CONTACT.close,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "RUDAKI MARKET",
      url: `${SITE_URL}${localeUrl(lang, "/")}`,
      inLanguage: lang,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}${localeUrl(lang, "/search")}?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, products, banners, categories, bundles] = await Promise.all([
    getDictionary(lang),
    getHomeProducts(),
    getBanners(),
    getCategories(),
    getBundles(),
  ]);
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(homeJsonLd(lang, dict.info.tagline)) }} />
      <div className="-mb-2 sm:-mb-4">
        <DeliveryEta lang={lang} dict={dict} />
      </div>
      <HeroSlider slides={slides} />
      {categories && <HomeCategories lang={lang} dict={dict} categories={categories} />}

      {/* Маҷмӯаҳо: "Дастархони чой", ... — ҳама бо як тугма ба сабад (бо тахфиф, агар дар админ гузошта шуда бошад) */}
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

      {/* Танҳо 20 мол: аксиядорҳо аввал, баъд навтаринҳо. Ҳамаи дигар — дар каталог */}
      {products && products.length > 0 && (
        <section aria-labelledby="home-products">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 id="home-products" className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              {dict.home.title}
            </h2>
            <Link
              href={localizePath(lang, "/catalog")}
              className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-brand-text hover:underline"
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
