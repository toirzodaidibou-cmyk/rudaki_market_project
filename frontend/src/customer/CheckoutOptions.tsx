"use client";

import { useEffect, useState } from "react";
import { Check, Clock, CreditCard } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { clientApi } from "@/lib/clientApi";
import type { DeliveryOptions } from "@/lib/clientApi";
import { PaymentLogo } from "@/customer/PaymentLogo";

/** null — "ҳарчи зудтар"; string — оғози вақт (ISO); undefined — ҳанӯз интихоб нашудааст */
export type DeliveryChoice = string | null | undefined;

/**
 * Вақти расонидан (Ҳарчи зудтар / Имрӯз / Пагоҳ + вақтҳо) ва тарзи пардохт.
 * Вақтҳо аз сервер (соати Душанбе); reloadKey — барои аз нав гирифтан (масалан, вақт гузашт).
 */
export function CheckoutOptions({
  delivery,
  onDelivery,
  payment,
  onPayment,
  reloadKey,
}: {
  delivery: DeliveryChoice;
  onDelivery: (v: DeliveryChoice) => void;
  payment: string;
  onPayment: (v: string) => void;
  reloadKey: number;
}) {
  const { dict } = useI18n();
  const tc = dict.checkout;
  const [options, setOptions] = useState<DeliveryOptions | null>(null);
  const [day, setDay] = useState(0);

  useEffect(() => {
    let alive = true;
    clientApi
      .deliveryOptions()
      .then((o) => {
        if (!alive) return;
        setOptions(o);
        // Пешфарз: "ҳарчи зудтар" ё аввалин вақти холӣ
        const first = o.days[0]?.slots[0]?.start ?? null;
        onDelivery(o.asap ? null : first);
        setDay(0);
      })
      .catch(() => alive && setOptions(null));
    return () => {
      alive = false;
    };
    // onDelivery — setState аз волидайн (тағйир намеёбад)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  if (!options) return <div className="h-28 animate-pulse rounded-2xl bg-background" />;

  const dayLabel = (offset: number, date: string) =>
    offset === 0 ? tc.today : offset === 1 ? tc.tomorrow : date.split("-").reverse().slice(0, 2).join(".");
  const current = options.days[day];
  const chip = (active: boolean) =>
    `rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors ${
      active ? "border-accent bg-accent/15 text-foreground" : "border-border bg-background text-foreground hover:border-accent/50"
    }`;
  const payLabel: Record<string, string> = { cash: tc.payCash, alif: tc.payAlif, dc: tc.payDc, korti_milli: tc.payKortiMilli };

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Clock size={16} strokeWidth={2.2} aria-hidden className="text-accent" />
          {tc.deliveryTime}
        </legend>
        {options.asap ? (
          <button type="button" onClick={() => onDelivery(null)} aria-pressed={delivery === null} className={`${chip(delivery === null)} mb-2 w-full text-left`}>
            {tc.asap} <span className="font-normal text-muted">· {tc.asapHint}</span>
          </button>
        ) : (
          <p className="mb-2 rounded-xl bg-[#ff9f0a]/15 px-3 py-2 text-xs text-foreground">{tc.closedNow}</p>
        )}
        {options.days.length > 0 && (
          <>
            <div className="mb-2 flex gap-2">
              {options.days.map((d, i) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setDay(i)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold ${i === day ? "bg-foreground text-background" : "bg-background text-foreground"}`}
                >
                  {dayLabel(d.offset, d.date)}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {current?.slots.map((s) => (
                <button key={s.start} type="button" onClick={() => onDelivery(s.start)} aria-pressed={delivery === s.start} className={`${chip(delivery === s.start)} tabular-nums`}>
                  {s.from}–{s.to}
                </button>
              ))}
            </div>
          </>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
          <CreditCard size={16} strokeWidth={2.2} aria-hidden className="text-accent" />
          {tc.payment}
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {options.paymentMethods.map((m) => {
            const active = payment === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onPayment(m)}
                aria-pressed={active}
                className={`${chip(active)} relative flex items-center gap-2.5 text-left`}
              >
                <span key={String(active)} className={`inline-flex ${active ? "motion-safe:animate-pay-pop" : ""}`}>
                  <PaymentLogo method={m} size={34} />
                </span>
                <span className="min-w-0 leading-tight">{payLabel[m] ?? m}</span>
                {active && (
                  <span aria-hidden className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-on-accent shadow-md motion-safe:animate-pay-check">
                    <Check size={12} strokeWidth={3.5} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-muted">{tc.payHint}</p>
      </fieldset>
    </div>
  );
}
