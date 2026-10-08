"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
  CartSolidIcon,
  CatalogSolidIcon,
  HeartSolidIcon,
  HomeSolidIcon,
  ProfileSolidIcon,
} from "@/components/ui/icons";
import { localizePath, stripLocale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/getDictionary";
import { useCustomer } from "@/customer/CustomerProvider";
import { useI18n } from "@/i18n/I18nProvider";

type NavItem = {
  href: string;
  labelKey: keyof Omit<Dictionary["nav"], "menu">;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const items: NavItem[] = [
  { href: "/", labelKey: "home", Icon: HomeSolidIcon },
  { href: "/catalog", labelKey: "catalog", Icon: CatalogSolidIcon },
  { href: "/cart", labelKey: "cart", Icon: CartSolidIcon },
  { href: "/favorites", labelKey: "favorites", Icon: HeartSolidIcon },
  { href: "/profile", labelKey: "profile", Icon: ProfileSolidIcon },
];

function isActive(path: string, href: string) {
  return href === "/"
    ? path === "/"
    : path === href || path.startsWith(`${href}/`);
}

export function BottomNav() {
  const { locale, dict } = useI18n();
  const { cartCount } = useCustomer();
  const path = stripLocale(usePathname());

  return (
    // Телефон: панели пурра дар поён. Компютер: "dock"-и шинокунанда дар мобайн.
    <nav
      aria-label={dict.nav.menu}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:inset-x-auto md:bottom-5 md:left-1/2 md:w-[540px] md:-translate-x-1/2 md:rounded-full md:border md:px-3 md:pb-0 md:shadow-[0_16px_48px_-16px_rgba(0,0,0,0.3)]"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ href, labelKey, Icon }) => {
          const active = isActive(path, href);
          return (
            <li key={href}>
              <Link
                href={localizePath(locale, href)}
                aria-current={active ? "page" : undefined}
                className="group flex flex-col items-center gap-1 pt-2.5 pb-2 outline-none md:py-2.5"
              >
                <span
                  className={`flex h-7 items-center justify-center rounded-full transition-colors duration-200 group-focus-visible:ring-2 group-focus-visible:ring-accent group-active:scale-90 ${
                    active
                      ? "text-accent motion-safe:animate-nav-pop"
                      : "text-nav-icon group-hover:text-foreground"
                  }`}
                >
                  <span className="relative">
                    <Icon />
                    {/* Шумораи молҳо дар сабад */}
                    {labelKey === "cart" && cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff3b5c] px-1 text-[10px] font-bold text-white ring-2 ring-background tabular-nums motion-safe:animate-nav-pop">
                        {cartCount > 99 ? "99+" : cartCount}
                      </span>
                    )}
                  </span>
                </span>
                <span
                  className={`max-w-full truncate px-0.5 text-[11px] leading-none sm:text-xs ${
                    active
                      ? "font-semibold text-foreground"
                      : "text-foreground/80 group-hover:text-foreground"
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
