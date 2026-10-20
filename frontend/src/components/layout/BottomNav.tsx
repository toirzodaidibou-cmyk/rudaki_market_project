"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { CART_BUMP } from "@/lib/flyToCart";
import { BagIcon, GridIcon, HeartLineIcon, HomeIcon, UserIcon } from "@/components/ui/icons";
import { localizePath, stripLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/getDictionary";
import { useCustomer } from "@/customer/CustomerProvider";
import { useI18n } from "@/i18n/I18nProvider";

type NavItem = {
  href: string;
  labelKey: keyof Omit<Dictionary["nav"], "menu">;
  Icon: ComponentType<SVGProps<SVGSVGElement> & { active?: boolean }>;
};

const items: NavItem[] = [
  { href: "/", labelKey: "home", Icon: HomeIcon },
  { href: "/catalog", labelKey: "catalog", Icon: GridIcon },
  { href: "/cart", labelKey: "cart", Icon: BagIcon },
  { href: "/favorites", labelKey: "favorites", Icon: HeartLineIcon },
  { href: "/profile", labelKey: "profile", Icon: UserIcon },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}

/**
 * Менюи поён — панели шинокунанда (телефон) ё «dock» дар мобайн (компютер).
 * Дизайн 1: иконаи фаъол дар капсулаи сабз; 3: «шишагин» бо тугмаи калони сабад дар марказ.
 */
export function BottomNav() {
  const { locale, dict } = useI18n();
  const { cartCount } = useCustomer();
  const path = stripLocale(usePathname());
  // Ҳар «парвози мол» — сабад як бор меҷунбад (key-и нав аниматсияро аз нав сар мекунад)
  const [bumps, setBumps] = useState(0);
  useEffect(() => {
    const onBump = () => setBumps((n) => n + 1);
    window.addEventListener(CART_BUMP, onBump);
    return () => window.removeEventListener(CART_BUMP, onBump);
  }, []);

  return (
    <nav
      aria-label={dict.nav.menu}
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 rounded-[26px] bg-nav-bg shadow-[0_14px_40px_-14px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.04] backdrop-blur-xl backdrop-saturate-150 md:inset-x-auto md:bottom-5 md:left-1/2 md:w-[540px] md:-translate-x-1/2 md:px-2 dark:ring-white/[0.06] d3:rounded-full d3:ring-white/70"
    >
      <ul className="grid h-16 grid-cols-5 items-center px-1">
        {items.map(({ href, labelKey, Icon }) => {
          const active = isActive(path, href);
          const isCart = labelKey === "cart";
          const badge = isCart && cartCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-sale px-1 text-[10px] font-bold text-white tabular-nums ring-2 ring-[var(--card)] motion-safe:animate-nav-pop">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          );
          return (
            <li key={href} className="flex justify-center">
              <Link
                href={localizePath(locale, href)}
                aria-current={active ? "page" : undefined}
                aria-label={dict.nav[labelKey]}
                className={`group relative flex min-w-14 flex-col items-center gap-1 outline-none ${
                  active ? "text-nav-active" : "text-nav-ink hover:text-foreground"
                }`}
              >
                {/* Икона: дар дизайни 1 ва 3 — капсулаи фаъол; дар 3 сабад — доираи калон */}
                <span
                  className={`relative flex h-8 w-12 items-center justify-center rounded-xl transition-colors duration-200 group-focus-visible:ring-2 group-focus-visible:ring-accent group-active:scale-90 ${
                    active ? "bg-nav-active-bg motion-safe:animate-nav-pop" : ""
                  } ${
                    isCart
                      ? "d3:-mt-8 d3:h-14 d3:w-14 d3:rounded-full d3:bg-gradient-to-br d3:from-[#2ccf7d] d3:to-[#159a57] d3:text-white d3:shadow-[0_12px_24px_-8px_rgba(21,154,87,0.7),0_0_0_5px_rgba(255,255,255,0.85)] dark:d3:shadow-[0_12px_24px_-8px_rgba(21,154,87,0.7),0_0_0_5px_#0f1a14]"
                      : ""
                  }`}
                >
                  <span
                    key={isCart ? bumps : undefined}
                    data-cart-target={isCart ? "" : undefined}
                    className={`relative ${isCart && bumps > 0 ? "rm-cart-bump" : ""}`}
                  >
                    <Icon active={active} width={23} height={23} />
                    {badge}
                  </span>
                </span>
                <span
                  className={`max-w-full truncate px-0.5 text-[10.5px] leading-none sm:text-[11px] ${active ? "font-bold" : "font-medium"} ${
                    isCart ? "d3:sr-only" : ""
                  }`}
                >
                  {dict.nav[labelKey]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
