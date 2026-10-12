import Image from "next/image";
import Link from "next/link";
import { BoltIcon, ChevronRightIcon, ScooterIcon } from "@/components/ui/icons";
import { FREE_DELIVERY_FROM } from "@/config/store";
import { format, localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/getDictionary";
import { fileUrl } from "@/lib/api";
import type { Category } from "@/lib/api";

/** Лента: «Расонидан аз 30 дақиқа · аз 200 с. — ройгон» → харитаи расонидан. */
export function DeliveryEta({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  return (
    <Link
      href={`${localizePath(lang, "/")}#delivery-map`}
      className="flex items-center gap-3 rounded-2xl bg-brand-soft px-3.5 py-2.5 text-brand-soft-ink transition-transform active:scale-[0.99] d2:bg-card d2:text-[#0f3d2e] d2:shadow-[var(--card-shadow)] dark:d2:text-foreground d3:bg-card d3:text-foreground d3:ring-1 d3:ring-card-ring"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent d3:rounded-full">
        <BoltIcon width={20} height={20} className="d2:hidden" />
        <ScooterIcon width={20} height={20} className="hidden d2:block" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-bold">{dict.home.eta}</span>
        <span className="block truncate text-xs opacity-75">
          {format(dict.home.etaFree, { amount: `${FREE_DELIVERY_FROM} ${dict.product.currency}` })}
        </span>
      </span>
      <span className="ml-auto shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-extrabold text-on-accent d2:bg-[#0f3d2e] d2:text-[#ffd9b8]">
        {dict.home.etaMap}
      </span>
    </Link>
  );
}

/** Қатори категорияҳо дар саҳифаи асосӣ (варақзанӣ ба паҳлӯ). */
export function HomeCategories({ lang, dict, categories }: { lang: Locale; dict: Dictionary; categories: Category[] }) {
  const visible = categories.filter((c) => (c.productCount ?? 1) > 0);
  if (visible.length === 0) return null;
  return (
    <section aria-labelledby="home-cats">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 id="home-cats" className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          {dict.home.categories}
        </h2>
        <Link
          href={localizePath(lang, "/catalog")}
          className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-brand-text hover:underline"
        >
          {dict.home.all} <ChevronRightIcon width={16} height={16} />
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {visible.map((c) => (
          <li key={c.slug} className="w-[76px] shrink-0 snap-start sm:w-[92px]">
            <Link href={localizePath(lang, `/catalog/${c.slug}`)} className="group flex flex-col items-center gap-1.5 text-center">
              <span className="flex aspect-square w-full items-center justify-center rounded-[22px] bg-card shadow-[var(--card-shadow)] ring-1 ring-card-ring transition-transform group-hover:-translate-y-0.5 group-active:scale-95 d2:rounded-full d3:rounded-[24px]">
                {c.icon && (
                  <Image
                    src={fileUrl(c.icon)!}
                    alt=""
                    width={52}
                    height={52}
                    unoptimized
                    className="h-[60%] w-[60%] object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                )}
              </span>
              <span className="line-clamp-2 text-[11.5px] leading-tight font-semibold text-foreground sm:text-xs">
                {c.name[lang] || c.name.tg}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
