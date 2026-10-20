"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { CartButton, usePriceFormat } from "@/components/product/ProductCard";
import { HeartIcon } from "@/components/ui/icons";
import { useCustomer } from "@/customer/CustomerProvider";
import { useI18n } from "@/i18n/I18nProvider";

/** Нарх, "Ба сабад", писандида ва мубодила (саҳифаи мол). */
export function ProductActions({ id, name, price, oldPrice }: { id: number; name: string; price: number; oldPrice: number | null }) {
  const { dict } = useI18n();
  const t = dict.product;
  const formatPrice = usePriceFormat();
  const { isFavorite, toggleFavorite } = useCustomer();
  const favorite = isFavorite(id);
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: name, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // корбар бекор кард
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <span className="text-3xl font-extrabold tracking-tight text-price tabular-nums">{formatPrice(price)}</span>
        {oldPrice && oldPrice > price && <span className="text-lg text-muted line-through tabular-nums">{formatPrice(oldPrice)}</span>}
      </div>

      <div className="mt-4 flex gap-2">
        <div className="flex-1">
          <CartButton productId={id} label={t.addToCart} size="lg" />
        </div>
        <button
          type="button"
          onClick={() => toggleFavorite(id)}
          aria-pressed={favorite}
          aria-label={favorite ? t.favoriteRemove : t.favoriteAdd}
          title={favorite ? t.favoriteRemove : t.favoriteAdd}
          className="flex h-13 w-13 shrink-0 items-center justify-center rounded-btn bg-card ring-1 ring-border transition-transform hover:bg-surface-hover active:scale-90"
        >
          <HeartIcon
            width={26}
            height={26}
            strokeWidth={1.8}
            className={favorite ? "fill-sale text-sale" : "text-foreground"}
          />
        </button>
        <button
          type="button"
          onClick={share}
          aria-label={dict.productPage.share}
          title={copied ? dict.productPage.copied : dict.productPage.share}
          className="flex h-13 w-13 shrink-0 items-center justify-center rounded-btn bg-card text-foreground ring-1 ring-border transition-transform hover:bg-surface-hover active:scale-90"
        >
          {copied ? (
            <Check size={22} strokeWidth={2.5} aria-hidden className="text-accent" />
          ) : (
            <Share2 size={22} strokeWidth={2} aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
