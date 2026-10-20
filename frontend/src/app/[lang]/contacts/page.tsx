import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { InfoCard, InfoShell } from "@/components/info/InfoShell";
import { TelegramIcon, WhatsAppIcon } from "@/components/ui/BrandIcons";
import { STORE_CONTACT } from "@/config/store";
import { format, hasLocale, localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { alternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/contacts">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = (await getDictionary(lang)).info;
  return {
    title: `${t.contacts.title} — RUDAKI MARKET`,
    description: `${t.contacts.phone}: ${STORE_CONTACT.phone}`,
    alternates: alternates(lang, "/contacts"),
  };
}

/** «Тамос»: телефон, WhatsApp, Telegram, соатҳои кор, минтақаи расонидан. */
export default async function ContactsPage({ params }: PageProps<"/[lang]/contacts">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.info.contacts;
  const btn = "inline-flex items-center rounded-btn px-4 py-2 text-sm font-bold transition-transform active:scale-95";
  const ic = { size: 22, strokeWidth: 2, "aria-hidden": true } as const;

  return (
    <InfoShell title={t.title}>
      <InfoCard icon={<Phone {...ic} />} title={t.phone}>
        <span className="block text-xl font-extrabold tracking-tight text-foreground tabular-nums">{STORE_CONTACT.phone}</span>
        <a href={STORE_CONTACT.phoneHref} className={`${btn} mt-3 bg-accent text-on-accent`}>
          {t.call}
        </a>
      </InfoCard>
      <InfoCard icon={<MessageCircle {...ic} />} title="WhatsApp · Telegram">
        <span className="block">{STORE_CONTACT.phone} · {STORE_CONTACT.telegramName}</span>
        <span className="mt-3 flex flex-wrap gap-2">
          <a href={STORE_CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className={`${btn} gap-2 bg-[#25D366] text-white`}>
            <WhatsAppIcon className="h-4.5 w-4.5" />
            WhatsApp
          </a>
          <a href={STORE_CONTACT.telegram} target="_blank" rel="noopener noreferrer" className={`${btn} gap-2 bg-[#229ED9] text-white`}>
            <TelegramIcon className="h-4.5 w-4.5" />
            Telegram
          </a>
        </span>
      </InfoCard>
      <InfoCard icon={<Clock {...ic} />} title={t.hours}>
        {format(dict.info.everyday, { hours: `${STORE_CONTACT.open}–${STORE_CONTACT.close}` })}
      </InfoCard>
      <InfoCard icon={<MapPin {...ic} />} title={t.area}>
        {t.areaValue}{" "}
        <Link href={`${localizePath(lang, "/")}#delivery-map`} className="font-semibold text-brand-text hover:underline">
          {t.map} →
        </Link>
      </InfoCard>
    </InfoShell>
  );
}
