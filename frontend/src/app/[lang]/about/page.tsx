import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InfoShell } from "@/components/info/InfoShell";
import { hasLocale, localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { alternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/about">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = (await getDictionary(lang)).info;
  return { title: `${t.about.title} — RUDAKI MARKET`, description: t.tagline, alternates: alternates(lang, "/about") };
}

/** «Дар бораи мо» */
export default async function AboutPage({ params }: PageProps<"/[lang]/about">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.info;

  return (
    <InfoShell title={t.about.title}>
      <div className="rounded-card bg-card p-5 shadow-[var(--card-shadow)] ring-1 ring-card-ring sm:p-7">
        <p className="text-lg leading-relaxed font-semibold text-foreground">{t.about.p1}</p>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">{t.about.p2}</p>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">{t.about.p3}</p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link
            href={localizePath(lang, "/catalog")}
            className="rounded-btn bg-accent px-5 py-3 text-sm font-bold text-on-accent transition-transform active:scale-95"
          >
            {dict.nav.catalog}
          </Link>
          <Link
            href={localizePath(lang, "/contacts")}
            className="rounded-btn bg-surface px-5 py-3 text-sm font-bold text-foreground ring-1 ring-border transition-transform active:scale-95"
          >
            {t.contacts.title}
          </Link>
        </div>
      </div>
    </InfoShell>
  );
}
