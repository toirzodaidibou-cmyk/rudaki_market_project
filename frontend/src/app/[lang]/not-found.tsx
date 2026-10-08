"use client";

import Link from "next/link";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";

export default function NotFound() {
  const { locale, dict } = useI18n();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="bg-gradient-to-br from-brand-from to-brand-to bg-clip-text text-7xl font-extrabold tracking-tight text-transparent">
        404
      </p>
      <h1 className="mt-4 text-xl font-bold text-foreground">
        {dict.notFound.title}
      </h1>
      <p className="mt-2 max-w-sm text-muted">{dict.notFound.text}</p>
      <Link
        href={localizePath(locale, "/")}
        className="mt-6 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent transition-transform hover:scale-[1.03] active:scale-95"
      >
        {dict.notFound.back}
      </Link>
    </main>
  );
}
