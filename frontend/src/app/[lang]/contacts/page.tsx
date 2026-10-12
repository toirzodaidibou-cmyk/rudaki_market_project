import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InfoCard, InfoShell } from "@/components/info/InfoShell";
import { STORE_CONTACT } from "@/config/store";
import { format, hasLocale, localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";

export async function generateMetadata({ params }: PageProps<"/[lang]/contacts">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = (await getDictionary(lang)).info;
  return { title: `${t.contacts.title} — RUDAKI MARKET`, description: `${t.contacts.phone}: ${STORE_CONTACT.phone}` };
}

/** «Тамос»: телефон, WhatsApp, Telegram, соатҳои кор, минтақаи расонидан. */
export default async function ContactsPage({ params }: PageProps<"/[lang]/contacts">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.info.contacts;
  const btn = "inline-flex items-center rounded-btn px-4 py-2 text-sm font-bold transition-transform active:scale-95";

  return (
    <InfoShell title={t.title}>
      <InfoCard icon="📞" title={t.phone}>
        <span className="block text-xl font-extrabold tracking-tight text-foreground tabular-nums">{STORE_CONTACT.phone}</span>
        <a href={STORE_CONTACT.phoneHref} className={`${btn} mt-3 bg-accent text-on-accent`}>
          {t.call}
        </a>
      </InfoCard>
      <InfoCard icon="💬" title="WhatsApp · Telegram">
        <span className="block">{STORE_CONTACT.phone} · {STORE_CONTACT.telegramName}</span>
        <span className="mt-3 flex flex-wrap gap-2">
          <a href={STORE_CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className={`${btn} bg-[#25D366] text-white`}>
            WhatsApp
          </a>
          <a href={STORE_CONTACT.telegram} target="_blank" rel="noopener noreferrer" className={`${btn} bg-[#229ED9] text-white`}>
            Telegram
          </a>
        </span>
      </InfoCard>
      <InfoCard icon="🕐" title={t.hours}>
        {format(dict.info.everyday, { hours: `${STORE_CONTACT.open}–${STORE_CONTACT.close}` })}
      </InfoCard>
      <InfoCard icon="📍" title={t.area}>
        {t.areaValue}{" "}
        <Link href={`${localizePath(lang, "/")}#delivery-map`} className="font-semibold text-brand-text hover:underline">
          {t.map} →
        </Link>
      </InfoCard>
    </InfoShell>
  );
}
