// Танзимоти забонҳо. Ин файл ҳам дар server ва ҳам дар client истифода мешавад.

export const locales = ["tg", "ru", "en", "uz"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "tg";

// Забони интихобкардаи корбар дар ин cookie нигоҳ дошта мешавад (proxy онро мехонад).
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const localeNames: Record<Locale, { short: string; name: string }> = {
  tg: { short: "TJ", name: "Тоҷикӣ" },
  ru: { short: "RU", name: "Русский" },
  en: { short: "EN", name: "English" },
  uz: { short: "UZ", name: "Oʻzbekcha" },
};

/** Интихоби забонро барои боздидҳои оянда дар cookie нигоҳ медорад (1 сол). Танҳо дар браузер. */
export function saveLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function hasLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** "/cart" + "ru" → "/ru/cart";  "/" + "ru" → "/ru" */
export function localizePath(locale: Locale, path: string): string {
  return `/${locale}${path === "/" ? "" : path}`;
}

/** "/ru/cart" → "/cart";  "/ru" → "/" */
export function stripLocale(pathname: string): string {
  const parts = pathname.split("/");
  if (!hasLocale(parts[1] ?? "")) return pathname;
  return `/${parts.slice(2).join("/")}`;
}

/** "Нест кардани «{term}»" + { term: "телефон" } → "Нест кардани «телефон»" */
export function format(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}
