"use client";

import { IconButton } from "@/components/ui/IconButton";
import { PaletteIcon } from "@/components/ui/icons";
import { useI18n } from "@/i18n/I18nProvider";

const DESIGNS = ["1", "2", "3"] as const;

/**
 * Ивази дизайн: 1 «Сабзи тару тоза» → 2 «Ҷангалӣ + норинҷӣ» → 3 «Сабзи нармранг» → 1.
 * Интихоб дар localStorage нигоҳ дошта мешавад (скрипти layout онро пеш аз расми саҳифа мегузорад).
 */
export function DesignToggle() {
  const { dict } = useI18n();

  function next() {
    const root = document.documentElement;
    const current = root.getAttribute("data-design") ?? "1";
    const design = DESIGNS[(DESIGNS.indexOf(current as (typeof DESIGNS)[number]) + 1) % DESIGNS.length];
    root.setAttribute("data-design", design);
    try {
      localStorage.setItem("design", design);
    } catch {
      // localStorage дастрас нест — дизайн танҳо барои ҳамин сессия
    }
  }

  // Рақами дизайни ҷорӣ (1/2/3) бо CSS нишон дода мешавад — бе ихтилофи server/client
  return (
    <IconButton label={dict.header.changeDesign} onClick={next} className="relative">
      <PaletteIcon />
      <span className="absolute -right-0.5 -bottom-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] leading-none font-extrabold text-on-accent ring-2 ring-header-bg">
        <span className="d2:hidden d3:hidden">1</span>
        <span className="hidden d2:inline">2</span>
        <span className="hidden d3:inline">3</span>
      </span>
    </IconButton>
  );
}
