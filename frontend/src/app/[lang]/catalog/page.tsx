import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon } from "@/components/ui/icons";
import { hasLocale, localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { fileUrl, getCategories } from "@/lib/api";
import { alternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/catalog">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: `${dict.nav.catalog} — RUDAKI MARKET`, description: dict.info.tagline, alternates: alternates(lang, "/catalog") };
}

export default async function CatalogPage({ params }: PageProps<"/[lang]/catalog">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const [dict, categories] = await Promise.all([getDictionary(lang), getCategories()]);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 sm:px-6 sm:pt-6">
      <h1 className="mb-2 px-1 text-2xl font-extrabold tracking-tight text-foreground sm:mb-4 sm:text-3xl">
        {dict.nav.catalog}
      </h1>

      {categories === null ? (
        <p className="px-1 py-10 text-muted">{dict.catalog.loadError}</p>
      ) : (
        // Телефон: рӯйхат (мисли alif shop). Компютер: 2–3 сутун.
        <ul className="grid gap-x-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Категорияи холӣ пинҳон — вақте мол илова шавад, худкор пайдо мешавад */}
          {categories.filter((c) => (c.productCount ?? 1) > 0).map((c) => {
            const icon = fileUrl(c.icon);
            return (
              <li key={c.slug}>
                <Link
                  href={localizePath(lang, `/catalog/${c.slug}`)}
                  className="group flex items-center gap-4 rounded-2xl px-1 py-3 transition-colors hover:bg-surface active:bg-surface sm:px-3"
                >
                  {icon ? (
                    // Иконаҳо аллакай хурд ва WebP ҳастанд — оптимизатсияи Next лозим нест
                    <Image
                      src={icon}
                      alt=""
                      width={36}
                      height={36}
                      unoptimized
                      className="h-9 w-9 shrink-0 object-contain transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                    />
                  ) : (
                    <span className="h-9 w-9 shrink-0 rounded-xl bg-surface" />
                  )}
                  <span className="flex-1 text-[17px] text-foreground transition-colors group-hover:text-accent">
                    {c.name[lang] || c.name.tg}
                  </span>
                  {c.productCount > 0 && <span className="text-sm text-muted tabular-nums">{c.productCount}</span>}
                  <ChevronRightIcon
                    width={20}
                    height={20}
                    strokeWidth={2.2}
                    className="shrink-0 text-foreground transition-all group-hover:translate-x-0.5 group-hover:text-accent"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
