"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePriceFormat } from "@/components/product/ProductCard";
import { ChevronRightIcon } from "@/components/ui/icons";
import { useCustomer } from "@/customer/CustomerProvider";
import { localizePath, stripLocale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";

/**
 * Дизайни 2: панели шинокунандаи сабад болои менюи поён (телефон) — мизоҷ ҳамеша шумора ва маблағро мебинад.
 * Дар дизайнҳои дигар ва дар саҳифаи сабад пинҳон аст.
 */
export function CartBar() {
  const { locale, dict } = useI18n();
  const { cart, cartCount } = useCustomer();
  const formatPrice = usePriceFormat();
  const path = stripLocale(usePathname());
  if (cartCount === 0 || !cart || path === "/cart") return null;

  const total = cart.totalPrice;
  const free = cart.freeDeliveryFrom > 0 && total >= cart.freeDeliveryFrom;
  return (
    <Link
      href={localizePath(locale, "/cart")}
      className="fixed inset-x-3.5 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 hidden h-14 items-center gap-3 rounded-[18px] bg-[#0f3d2e] pr-2 pl-3.5 text-white shadow-[0_14px_30px_-12px_rgba(0,0,0,0.5)] transition-transform active:scale-[0.98] motion-safe:animate-menu-in d2:flex md:d2:hidden dark:bg-[#123f2f]"
    >
      <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-accent px-1.5 text-[13px] font-extrabold tabular-nums">
        {cartCount > 99 ? "99+" : cartCount}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-bold">{dict.cart.title}</span>
        <span className="block truncate text-xs text-white/70">
          {dict.checkout.delivery}: {free ? dict.checkout.free : formatPrice(cart.deliveryPrice)}
        </span>
      </span>
      <span className="ml-auto flex h-10 items-center gap-1 rounded-xl bg-accent px-3.5 text-sm font-extrabold tabular-nums">
        {formatPrice(total)}
        <ChevronRightIcon width={16} height={16} />
      </span>
    </Link>
  );
}
