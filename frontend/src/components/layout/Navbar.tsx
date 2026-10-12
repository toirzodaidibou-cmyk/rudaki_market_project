import Link from "next/link";
import { DesignToggle } from "@/components/layout/DesignToggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SearchBar } from "@/components/search/SearchBar";
import { MapPinIcon } from "@/components/ui/icons";
import { localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/getDictionary";

/**
 * Сарлавҳа. Ранг ва шакл аз дизайн: 1 — шаффофи равшан, 2 — сабзи торик бо кунҷҳои мудаввари поён,
 * 3 — «шишагин» (blur).
 */
export function Navbar({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <header className="sticky top-0 z-50 bg-header-bg backdrop-blur-xl backdrop-saturate-150 d2:rounded-b-[28px] d2:shadow-[0_12px_30px_-18px_rgba(15,61,46,0.6)] d2:backdrop-blur-none">
      {/* Дар телефон: логотип + тугмаҳо дар сатри 1, search дар сатри 2.
          Дар компютер: ҳама дар як сатр, search дар мобайн. */}
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-3 px-4 pt-3 pb-3 sm:px-6 md:gap-x-8 d2:pb-4">
        <Link href={localizePath(locale, "/")} aria-label={dict.header.homeAria} className="order-1">
          <Logo />
        </Link>

        <div className="order-2 ml-auto flex items-center gap-1.5 sm:gap-2 md:order-3 md:ml-0">
          {/* Ноҳияи расонидан → харитаи саҳифаи асосӣ */}
          <Link
            href={`${localizePath(locale, "/")}#delivery-map`}
            aria-label={dict.header.chooseCity}
            title={dict.header.chooseCity}
            className="hidden h-9 items-center gap-1 rounded-btn bg-header-chip pr-3 pl-2 text-[13px] font-semibold text-header-chip-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all hover:brightness-95 active:scale-95 min-[400px]:flex d2:shadow-none"
          >
            <MapPinIcon width={17} height={17} className="text-accent" />
            <span className="hidden sm:inline">{dict.header.district}</span>
          </Link>
          <LanguageSwitcher />
          <DesignToggle />
          <ThemeToggle />
        </div>

        <div className="order-3 w-full md:order-2 md:flex md:w-auto md:flex-1 md:justify-center">
          <div className="w-full md:max-w-2xl">
            <SearchBar />
          </div>
        </div>
      </nav>
    </header>
  );
}
