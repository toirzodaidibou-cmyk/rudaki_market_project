"use client";

import { createContext, use } from "react";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/getDictionary";

type I18nValue = { locale: Locale; dict: Dictionary };

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: I18nValue & { children: ReactNode }) {
  return <I18nContext value={{ locale, dict }}>{children}</I18nContext>;
}

/** Забони ҷорӣ ва луғат барои Client Component-ҳо. */
export function useI18n(): I18nValue {
  const value = use(I18nContext);
  if (!value) throw new Error("useI18n бояд дар дохили <I18nProvider> истифода шавад");
  return value;
}
