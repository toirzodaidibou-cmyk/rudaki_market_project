import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddBundleButton } from "@/components/bundle/AddBundleButton";
import { BundleCover } from "@/components/bundle/BundleCover";
import { ProductCard } from "@/components/product/ProductCard";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { format, hasLocale, localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { fileUrl, getBundle } from "@/lib/api";

type Props = PageProps<"/[lang]/bundle/[id]">;

const idFrom = (v: string) => (/^\d{1,9}$/.test(v) ? Number(v) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  const bid = idFrom(id);
  if (!hasLocale(lang) || !bid) return {};
  const b = await getBundle(bid);
  return b ? { title: `${b.name[lang] || b.name.tg} — RUDAKI MARKET` } : {};
}

/** Маҷмӯа: рӯйхати молҳо бо миқдор ва тугмаи "Ҳамаашро ба сабад". */
export default async function BundlePage({ params }: Props) {
  const { lang, id } = await params;
  const bid = idFrom(id);
  if (!hasLocale(lang) || !bid) notFound();
  const [dict, b] = await Promise.all([getDictionary(lang), getBundle(bid)]);
  if (!b) notFound();
  const t = dict.bundles;
  const nf = new Intl.NumberFormat(lang === "en" ? "en-US" : "ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const count = b.items.reduce((n, i) => n + i.quantity, 0);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 pb-8 sm:px-6 sm:pt-6">
      <Link
        href={localizePath(lang, "/")}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon width={16} height={16} />
        {t.back}
      </Link>

      <div className="rounded-[28px] bg-surface p-5 sm:p-8">
        <div className="flex items-start gap-4">
          <BundleCover images={b.items.flatMap((i) => i.product.images.slice(0, 1))} className="h-20 w-20 sm:h-24 sm:w-24" />
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{b.name[lang] || b.name.tg}</h1>
            {(b.description[lang] || b.description.tg) && (
              <p className="mt-1 text-muted">{b.description[lang] || b.description.tg}</p>
            )}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">
              {t.total} · {format(t.items, { n: String(count) })}
            </p>
            <p className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
              {nf.format(b.total)} {dict.product.currency}
            </p>
          </div>
          <div className="w-full sm:w-80">
            <AddBundleButton bundleId={b.id} label={t.addAll} />
          </div>
        </div>
      </div>

      <h2 className="mt-8 mb-4 text-xl font-extrabold tracking-tight text-foreground">{t.inside}</h2>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5">
        {b.items.map(({ product: p, quantity }) => (
          <li key={p.id} className="relative">
            {quantity > 1 && (
              <span className="absolute -top-2 -right-1 z-10 rounded-full bg-foreground px-2.5 py-0.5 text-sm font-extrabold text-background shadow">
                × {quantity}
              </span>
            )}
            <ProductCard
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
    </main>
  );
}
