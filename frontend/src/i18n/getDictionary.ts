import type { Locale } from "@/i18n/config";
import type tgDictionary from "@/i18n/dictionaries/tg.json";

// Шакли луғат аз tg.json гирифта мешавад: агар дар забони дигар калиде
// намерасад, TypeScript хато медиҳад.
export type Dictionary = typeof tgDictionary;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  tg: () => import("@/i18n/dictionaries/tg.json").then((m) => m.default),
  ru: () => import("@/i18n/dictionaries/ru.json").then((m) => m.default),
  en: () => import("@/i18n/dictionaries/en.json").then((m) => m.default),
  uz: () => import("@/i18n/dictionaries/uz.json").then((m) => m.default),
};

export function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
