import Link from "next/link";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SearchBar } from "@/components/search/SearchBar";
import { IconButton } from "@/components/ui/IconButton";
import { MapPinIcon } from "@/components/ui/icons";
import { localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/getDictionary";

export function Navbar({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      {/* Дар телефон: логотип + тугмаҳо дар сатри 1, search дар сатри 2.
          Дар компютер: ҳама дар як сатр, search дар мобайн. */}
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-3 md:gap-x-8 px-4 py-3 sm:px-6">
        <Link
          href={localizePath(locale, "/")}
          aria-label={dict.header.homeAria}
          className="order-1"
        >
          <Logo />
        </Link>

        <div className="order-2 ml-auto flex items-center gap-1.5 sm:gap-2 md:order-3 md:ml-0">
          <IconButton label={dict.header.chooseCity}>
            <MapPinIcon />
          </IconButton>
          <LanguageSwitcher />
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
