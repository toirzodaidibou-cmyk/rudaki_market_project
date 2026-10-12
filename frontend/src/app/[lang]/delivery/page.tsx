import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InfoCard, InfoShell } from "@/components/info/InfoShell";
import { DELIVERY_FEE, FREE_DELIVERY_FROM, STORE_CONTACT } from "@/config/store";
import { format, hasLocale, localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { alternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[lang]/delivery">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const t = (await getDictionary(lang)).info;
  return { title: `${t.delivery.title} — RUDAKI MARKET`, description: t.delivery.zone, alternates: alternates(lang, "/delivery") };
}

/** «Расонидан ва пардохт» — қоидаҳо аз танзимоти мағоза (config/store, ҳамон қоидаҳои backend). */
export default async function DeliveryPage({ params }: PageProps<"/[lang]/delivery">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const t = dict.info.delivery;
  const c = dict.product.currency;

  return (
    <InfoShell title={t.title}>
      <InfoCard icon="📍" title={t.zoneT}>
        {t.zone}{" "}
        <Link href={`${localizePath(lang, "/")}#delivery-map`} className="font-semibold text-brand-text hover:underline">
          {dict.info.contacts.map} →
        </Link>
      </InfoCard>
      <InfoCard icon="🕐" title={t.timeT}>
        {format(t.time, { open: STORE_CONTACT.open, close: STORE_CONTACT.close })}
      </InfoCard>
      <InfoCard icon="🚚" title={t.costT}>
        {format(t.cost, { fee: `${DELIVERY_FEE} ${c}`, free: `${FREE_DELIVERY_FROM} ${c}` })}
      </InfoCard>
      <InfoCard icon="💳" title={t.payT}>
        {t.pay}
      </InfoCard>
      <InfoCard icon="🛒" title={t.howT}>
        <ol className="mt-1 list-decimal space-y-1 pl-5">
          {t.how.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </InfoCard>
      <InfoCard icon="💬" title={t.questionsT}>
        {t.questions}{" "}
        <Link href={localizePath(lang, "/contacts")} className="font-semibold text-brand-text hover:underline">
          {dict.info.contacts.title} →
        </Link>
      </InfoCard>
    </InfoShell>
  );
}
