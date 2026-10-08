import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultLocale, hasLocale, LOCALE_COOKIE } from "@/i18n/config";

// Агар дар URL забон набошад (масалан "/cart"), ба "/{забон}/cart" мегузаронад.
// Забон: аввал cookie (интихоби корбар), баъд забони пешфарз (tg).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (hasLocale(pathname.split("/")[1] ?? "")) return;

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = saved && hasLocale(saved) ? saved : defaultLocale;

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // _next, api ва файлҳо (бо нуқта: favicon.ico, logo.svg, ...) истисно мешаванд.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
