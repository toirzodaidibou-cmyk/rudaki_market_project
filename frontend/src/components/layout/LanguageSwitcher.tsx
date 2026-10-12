"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckIcon, GlobeIcon } from "@/components/ui/icons";
import {
  localeNames,
  locales,
  localizePath,
  saveLocaleCookie,
  stripLocale,
} from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";

export function LanguageSwitcher() {
  const { locale, dict } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Пӯшидан бо клик берун аз меню ё бо Esc.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function changeLocale(next: Locale) {
    setOpen(false);
    if (next === locale) return;
    saveLocaleCookie(next);
    router.push(localizePath(next, stripLocale(pathname)) + window.location.search);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`${dict.header.language}: ${localeNames[locale].name}`}
        title={dict.header.language}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-btn bg-header-chip px-3 text-[13px] font-semibold text-header-chip-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all hover:brightness-95 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <GlobeIcon width={16} height={16} className="hidden sm:block" />
        {localeNames[locale].short}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={dict.header.language}
          className="absolute top-full right-0 z-50 mt-2 w-52 origin-top-right rounded-2xl border border-border bg-background p-1.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.3)] motion-safe:animate-menu-in"
        >
          {locales.map((l) => {
            const current = l === locale;
            return (
              <button
                key={l}
                type="button"
                role="menuitemradio"
                aria-checked={current}
                lang={l}
                onClick={() => changeLocale(l)}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[15px] text-foreground transition-colors hover:bg-surface ${
                  current ? "font-semibold" : ""
                }`}
              >
                <span
                  className={`flex h-6 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
                    current ? "bg-accent text-on-accent" : "bg-surface text-muted"
                  }`}
                >
                  {localeNames[l].short}
                </span>
                <span className="flex-1">{localeNames[l].name}</span>
                {current && <CheckIcon width={16} height={16} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
