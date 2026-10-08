"use client";

import { IconButton } from "@/components/ui/IconButton";
import { MoonIcon, SunIcon } from "@/components/ui/icons";
import { useI18n } from "@/i18n/I18nProvider";

export function ThemeToggle() {
  const { dict } = useI18n();

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage дастрас нест (масалан, private mode) — мавзӯъ танҳо барои ҳамин сессия.
    }
  }

  // Ҳарду икона рендер мешаванд ва CSS яке аз онҳоро нишон медиҳад,
  // то байни server ва client ихтилоф (hydration mismatch) набошад.
  return (
    <IconButton label={dict.header.toggleTheme} onClick={toggleTheme}>
      <SunIcon className="dark:hidden" />
      <MoonIcon className="hidden dark:block" />
    </IconButton>
  );
}
