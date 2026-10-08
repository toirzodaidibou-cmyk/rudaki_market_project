"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BadgeIcon, HeartIcon } from "@/components/ui/icons";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { useCustomer } from "@/customer/CustomerProvider";

export type ProductCardData = {
  id: number;
  name: string;
  price: number;
  oldPrice: number | null;
  sizeLabel: string | null;
  isNew: boolean;
  /** URL-ҳои пурраи суратҳо (то 3) */
  images: string[];
};

/** 23.6 → "23,60 с." (en: "23.60 TJS") */
export function usePriceFormat() {
  const { locale, dict } = useI18n();
  const nf = new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (v: number) => `${nf.format(v)} ${dict.product.currency}`;
}

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const { locale, dict } = useI18n();
  const t = dict.product;
  const formatPrice = usePriceFormat();
  const href = localizePath(locale, `/product/${product.id}`);
  const { isFavorite, toggleFavorite } = useCustomer();
  const favorite = isFavorite(product.id);
  const [slide, setSlide] = useState(0);
  // Аксия: −X% (танҳо агар нархи кӯҳна аз нархи ҷорӣ зиёд бошад)
  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.max(1, Math.round((1 - product.price / product.oldPrice) * 100))
      : 0;

  return (
    <article className="flex flex-col">
      {/* Сурат(ҳо) — бо ангушт варақ мезанед (scroll-snap), нуқтаҳо дар поён */}
      <div className="relative aspect-square overflow-hidden rounded-[22px] bg-white ring-1 ring-black/[0.06] ring-inset dark:ring-white/10">
        {/* Зер кардан — саҳифаи мол; варақ задан — сурати дигар */}
        <Link
          href={href}
          aria-label={product.name}
          className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            setSlide(Math.round(el.scrollLeft / el.clientWidth));
          }}
        >
          {(product.images.length ? product.images : [null]).map((src, i) => (
            <div key={src ?? i} className="relative h-full w-full shrink-0 snap-center">
              {src && (
                <Image
                  src={src}
                  alt={i === 0 ? product.name : ""}
                  fill
                  unoptimized
                  loading={priority && i === 0 ? "eager" : "lazy"}
                  sizes="(min-width: 1280px) 240px, (min-width: 640px) 30vw, 50vw"
                  className="object-contain p-4"
                />
              )}
            </div>
          ))}
        </Link>

        {(discount > 0 || product.sizeLabel) && (
          <div className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-1.5">
            {discount > 0 && (
              <span className="rounded-lg bg-[#ff3b5c] px-2 py-0.5 text-sm font-extrabold text-white shadow-sm">
                −{discount}%
              </span>
            )}
            {product.sizeLabel && (
              <span className="rounded-lg bg-white/90 px-2 py-0.5 text-sm font-bold text-[#c2185b] shadow-sm dark:bg-black/60 dark:text-white">
                {product.sizeLabel}
              </span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => toggleFavorite(product.id)}
          aria-pressed={favorite}
          aria-label={favorite ? t.favoriteRemove : t.favoriteAdd}
          title={favorite ? t.favoriteRemove : t.favoriteAdd}
          className="absolute top-2 right-2 flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90"
        >
          <HeartIcon
            width={28}
            height={28}
            strokeWidth={1.8}
            className={`transition-colors ${favorite ? "fill-[#ff3b5c] text-[#ff3b5c]" : "text-[#111]"}`}
          />
        </button>

        {product.isNew && (
          <span className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-[#9b3dff] py-1 pr-3 pl-2 text-sm font-medium text-white">
            <BadgeIcon width={16} height={16} />
            {t.isNew}
          </span>
        )}
      </div>

      {/* Нуқтаҳо (агар зиёда аз 1 сурат бошад) */}
      <div className="flex h-5 items-center justify-center gap-1.5">
        {product.images.length > 1 &&
          product.images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${i === slide ? "bg-accent" : "bg-foreground/15"}`}
            />
          ))}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2 px-0.5">
        <span className="text-xl font-extrabold tracking-tight text-foreground">{formatPrice(product.price)}</span>
        {product.oldPrice && (
          <span className="text-sm text-muted line-through">{formatPrice(product.oldPrice)}</span>
        )}
      </div>
      <h3 className="mt-1 line-clamp-2 min-h-12 px-0.5 text-base leading-6 text-foreground">
        <Link href={href} className="hover:underline">
          {product.name}
        </Link>
      </h3>

      <div className="mt-3">
        <CartButton productId={product.id} label={t.addToCart} />
      </div>
    </article>
  );
}

/** "Ба сабад" → баъд аз илова: [ − 2 + ]. Агар ворид нашуда бошад — равзанаи даромад. */
export function CartButton({ productId, label }: { productId: number; label: string }) {
  const { dict } = useI18n();
  const { cartQuantity, setCartQuantity } = useCustomer();
  const qty = cartQuantity(productId);

  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={() => setCartQuantity(productId, 1)}
        className="h-11 w-full rounded-xl bg-accent text-[15px] font-semibold text-on-accent transition-all hover:brightness-95 active:scale-[0.98]"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex h-11 w-full items-center justify-between rounded-xl bg-accent text-on-accent motion-safe:animate-menu-in">
      <button
        type="button"
        onClick={() => setCartQuantity(productId, qty - 1)}
        aria-label={dict.cart.decrease}
        className="flex h-full w-12 items-center justify-center rounded-l-xl text-2xl font-semibold transition-colors hover:bg-black/5 active:bg-black/10"
      >
        −
      </button>
      <span className="text-base font-bold tabular-nums" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        onClick={() => setCartQuantity(productId, qty + 1)}
        disabled={qty >= 99}
        aria-label={dict.cart.increase}
        className="flex h-full w-12 items-center justify-center rounded-r-xl text-2xl font-semibold transition-colors hover:bg-black/5 active:bg-black/10 disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
