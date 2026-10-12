import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductActions } from "@/components/product/ProductActions";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductDescription } from "@/components/product/ProductDescription";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ChevronLeftIcon, MapPinIcon } from "@/components/ui/icons";
import { DELIVERY_FEE, FREE_DELIVERY_FROM } from "@/config/store";
import { format, hasLocale, localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { fileUrl, getProduct } from "@/lib/api";

type Props = PageProps<"/[lang]/product/[id]">;

const idFrom = (v: string) => (/^\d{1,9}$/.test(v) ? Number(v) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params;
  const pid = idFrom(id);
  if (!hasLocale(lang) || !pid) return {};
  const p = await getProduct(pid);
  if (!p) return {};
  const name = p.name[lang] || p.name.ru;
  const image = p.images[0] ? fileUrl(p.images[0].thumb) : null;
  return {
    title: `${name} — RUDAKI MARKET`,
    description: `${name} · ${p.price} TJS`,
    openGraph: { title: name, images: image ? [image] : [] },
  };
}

/** Саҳифаи мол: суратҳо, нарх, сабад, тавсиф ва молҳои монанд. */
export default async function ProductPage({ params }: Props) {
  const { lang, id } = await params;
  const pid = idFrom(id);
  if (!hasLocale(lang) || !pid) notFound();
  const [dict, p] = await Promise.all([getDictionary(lang), getProduct(pid)]);
  if (!p) notFound();

  const t = dict.productPage;
  const name = p.name[lang] || p.name.ru;
  const description = p.description[lang] || p.description.ru;
  const discount = p.oldPrice && p.oldPrice > p.price ? Math.max(1, Math.round((1 - p.price / p.oldPrice) * 100)) : 0;
  const currency = dict.product.currency;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 pb-8 sm:px-6 sm:pt-6">
      <Link
        href={localizePath(lang, `/catalog/${p.category.slug}`)}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon width={16} height={16} />
        {p.category.name[lang] || p.category.name.tg}
      </Link>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
        <ProductGallery
          images={p.images.map((i) => ({ url: fileUrl(i.url)!, thumb: fileUrl(i.thumb)! }))}
          name={name}
          discount={discount}
          isNew={p.isNew}
        />

        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-2xl leading-tight font-extrabold tracking-tight text-foreground sm:text-3xl">{name}</h1>
            {p.sizeLabel && (
              <span className="mt-2 inline-block rounded-lg bg-size-bg px-2.5 py-1 text-sm font-bold text-size-ink d3:rounded-full d3:ring-1 d3:ring-card-ring">
                {p.sizeLabel}
              </span>
            )}
          </div>

          <ProductActions id={p.id} name={name} price={p.price} oldPrice={p.oldPrice} />

          <Link
            href={`${localizePath(lang, "/")}#delivery-map`}
            className="flex items-center gap-3 rounded-2xl bg-surface p-4 transition-colors hover:bg-surface-hover"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
              <MapPinIcon width={20} height={20} />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-foreground">{t.delivery}</span>
              <span className="block text-sm text-muted">
                {format(t.deliveryText, { fee: `${DELIVERY_FEE} ${currency}`, free: `${FREE_DELIVERY_FROM} ${currency}` })}
              </span>
            </span>
          </Link>

          {description && (
            <section aria-labelledby="desc">
              <h2 id="desc" className="mb-2 text-lg font-bold text-foreground">{t.description}</h2>
              <ProductDescription text={description} />
            </section>
          )}
        </div>
      </div>

      {p.similar.length > 0 && (
        <section aria-labelledby="similar" className="mt-10">
          <h2 id="similar" className="mb-4 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">{t.similar}</h2>
          <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            {p.similar.map((s) => (
              <li key={s.id} className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[19%]">
                <ProductCard
                  product={{
                    id: s.id,
                    name: s.name[lang] || s.name.tg,
                    price: s.price,
                    oldPrice: s.oldPrice,
                    sizeLabel: s.sizeLabel,
                    isNew: s.isNew,
                    images: s.images.map((src) => fileUrl(src)!),
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
