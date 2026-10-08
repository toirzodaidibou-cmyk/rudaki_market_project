"use client";

import dynamic from "next/dynamic";
import { useI18n } from "@/i18n/I18nProvider";

// Leaflet танҳо дар браузер кор мекунад (window) — бе SSR ва баъдтар бор мешавад
const RudakiMap = dynamic(() => import("./RudakiMap"), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-[28px] bg-surface sm:h-[500px] lg:h-[560px]" />,
});

/** Қисми поёни саҳифаи асосӣ: харитаи минтақаи расонидан (ноҳияи Рӯдакӣ). */
export function DeliveryMapSection() {
  const { dict } = useI18n();
  return (
    <section aria-labelledby="delivery-map" className="pb-4">
      <h2 id="delivery-map" className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
        {dict.map.title}
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted">{dict.map.subtitle}</p>
      <RudakiMap />
    </section>
  );
}
