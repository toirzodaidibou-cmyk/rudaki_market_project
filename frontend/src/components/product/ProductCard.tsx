"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HeartLineIcon, MinusIcon, PlusIcon } from "@/components/ui/icons";
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

/**
 * Корти мол. Шакл аз дизайн: 1 — корти сафед бо сояи нарм ва тугмаи сабзи «Ба сабад»;
 * 2 — сурат дар боло бо хат, тугмаи мудаввари норинҷии «+»; 3 — корти «шишагин», тугмаи ҳошиядор.
 */
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
    <article className="flex flex-col rounded-card bg-card p-2 shadow-[var(--card-shadow)] ring-1 ring-card-ring transition-shadow hover:shadow-[0_14px_30px_-18px_rgba(0,0,0,0.35)] d2:p-0">
      {/* Сурат(ҳо) — бо ангушт варақ мезанед (scroll-snap); замина ҳамеша сафед (суратҳои мол сафеданд) */}
      <div className="relative aspect-square overflow-hidden rounded-[calc(var(--r-card)-6px)] bg-white d2:rounded-b-none d2:rounded-t-card d2:border-b d2:border-border">
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
                  className="object-contain p-[11%] transition-transform duration-300 hover:scale-105"
                />
              )}
            </div>
          ))}
        </Link>

        {discount > 0 && (
          <span className="pointer-events-none absolute top-2 left-2 rounded-lg bg-sale px-1.5 py-0.5 text-xs font-extrabold text-white shadow-sm sm:text-[13px] d3:rounded-full d3:px-2">
            −{discount}%
          </span>
        )}
        {product.sizeLabel && (
          <span className="pointer-events-none absolute top-2 right-2 max-w-[60%] truncate rounded-md bg-size-bg px-1.5 py-0.5 text-[11px] font-bold text-size-ink sm:text-xs d3:rounded-full d3:px-2">
            {product.sizeLabel}
          </span>
        )}
        {product.isNew && (
          <span className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-new-bg px-1.5 py-0.5 text-[11px] font-bold text-new-ink sm:text-xs d3:rounded-full d3:px-2">
            ✦ {t.isNew}
          </span>
        )}

        <button
          type="button"
          onClick={() => toggleFavorite(product.id)}
          aria-pressed={favorite}
          aria-label={favorite ? t.favoriteRemove : t.favoriteAdd}
          title={favorite ? t.favoriteRemove : t.favoriteAdd}
          className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#1b2420] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.25)] transition-transform active:scale-90"
        >
          <HeartLineIcon
            width={17}
            height={17}
            className={`transition-colors ${favorite ? "fill-sale text-sale" : ""}`}
          />
        </button>

        {/* Нуқтаҳо (агар зиёда аз 1 сурат бошад) */}
        {product.images.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1">
            {product.images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === slide ? "w-3.5 bg-accent" : "w-1.5 bg-black/15"}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-1 pt-2.5 pb-0.5 d2:px-2.5 d2:pb-2.5">
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[17px] font-extrabold tracking-tight text-price tabular-nums sm:text-lg">
            {formatPrice(product.price)}
          </span>
          {discount > 0 && (
            <span className="text-xs text-muted line-through tabular-nums">{formatPrice(product.oldPrice!)}</span>
          )}
        </div>
        <h3 className="mt-0.5 line-clamp-2 min-h-[2.6em] text-[13.5px] leading-[1.3] text-foreground sm:text-sm d2:pr-11">
          <Link href={href} className="hover:underline">
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto pt-2.5">
          <CartButton productId={product.id} label={t.addToCart} inCard />
        </div>
      </div>
    </article>
  );
}

/**
 * "Ба сабад" → баъд аз илова: [ − 2 + ].
 * inCard — дар корти мол (дизайни 2: тугмаи мудаввари «+» дар кунҷ); size="lg" — саҳифаи мол.
 */
export function CartButton({
  productId,
  label,
  inCard = false,
  size = "md",
}: {
  productId: number;
  label: string;
  inCard?: boolean;
  size?: "md" | "lg";
}) {
  const { dict } = useI18n();
  const { cartQuantity, setCartQuantity } = useCustomer();
  const qty = cartQuantity(productId);
  const h = size === "lg" ? "h-13 text-base" : "h-10 text-sm";

  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={() => setCartQuantity(productId, 1)}
        aria-label={label || dict.cart.increase}
        className={`flex w-full items-center justify-center gap-1.5 rounded-btn bg-accent font-bold text-on-accent shadow-[0_8px_18px_-10px_var(--accent-glow)] transition-all hover:brightness-105 active:scale-[0.97] ${h} d3:bg-transparent d3:text-brand-text d3:shadow-none d3:ring-[1.5px] d3:ring-[#9fe0bd] d3:ring-inset d3:hover:bg-brand-soft dark:d3:ring-[#2b6b49] ${
          inCard ? "d2:-mt-11 d2:ml-auto d2:h-10 d2:w-10 d2:rounded-full d2:p-0" : ""
        }`}
      >
        <PlusIcon width={18} height={18} strokeWidth={2.4} />
        {label && <span className={inCard ? "d2:sr-only" : ""}>{label}</span>}
      </button>
    );
  }

  return (
    <div
      className={`flex w-full items-center justify-between rounded-btn bg-step-bg px-1 text-step-ink motion-safe:animate-menu-in ${h}`}
    >
      <button
        type="button"
        onClick={() => setCartQuantity(productId, qty - 1)}
        aria-label={dict.cart.decrease}
        className="flex aspect-square h-[80%] items-center justify-center rounded-[10px] bg-step-btn transition-transform active:scale-90 d3:rounded-full"
      >
        <MinusIcon width={16} height={16} strokeWidth={2.4} />
      </button>
      <span className="font-extrabold tabular-nums" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        onClick={() => setCartQuantity(productId, qty + 1)}
        disabled={qty >= 99}
        aria-label={dict.cart.increase}
        className="flex aspect-square h-[80%] items-center justify-center rounded-[10px] bg-step-btn transition-transform active:scale-90 disabled:opacity-40 d3:rounded-full"
      >
        <PlusIcon width={16} height={16} strokeWidth={2.4} />
      </button>
    </div>
  );
}
