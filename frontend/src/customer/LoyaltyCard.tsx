"use client";

import { useEffect, useState } from "react";
import { format } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { clientApi, formatPhone } from "@/lib/clientApi";
import type { LoyaltyCard as Card } from "@/lib/clientApi";

/** Рақам аз 0 то value дар ~0,9 с. (бе аниматсия, агар корбар «камтар ҳаракат»-ро интихоб карда бошад). */
function useCountUp(value: number) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || value === 0) {
      const id = requestAnimationFrame(() => setShown(value));
      return () => cancelAnimationFrame(id);
    }
    const start = performance.now();
    let id = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value]);
  return shown;
}

/** Корти бонусии Рӯдакӣ (профил): бонуси ҷамъшуда, бонуси оянда, рақами корт ва телефон. */
export function LoyaltyCard() {
  const { locale, dict } = useI18n();
  const t = dict.loyalty;
  const [card, setCard] = useState<Card | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    clientApi.loyalty().then(
      (c) => alive && setCard(c),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, []);

  const balance = useCountUp(card?.balance ?? 0);
  const nf = new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = card ? new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU", { maximumFractionDigits: 2 }).format(card.percent) : "";

  if (failed) return null;

  return (
    <div className="mx-auto w-full max-w-[400px]">
      <div
        className="relative isolate aspect-[1.586] w-full overflow-hidden rounded-[26px] text-white shadow-[0_18px_40px_-18px_rgba(9,90,45,0.65)] motion-safe:animate-menu-in"
        style={{ background: "linear-gradient(135deg, #3fd27f 0%, #19b25c 38%, #0b7f3d 100%)" }}
        aria-label={t.title}
      >
        {/* Мавҷҳои нарм (мисли корти бонкӣ) */}
        <svg aria-hidden viewBox="0 0 400 252" preserveAspectRatio="none" className="absolute inset-0 -z-10 h-full w-full">
          <path d="M0 175 C 90 120, 170 230, 400 150 L400 252 L0 252 Z" fill="rgba(255,255,255,0.10)" />
          <path d="M240 0 C 200 80, 260 160, 400 190 L400 0 Z" fill="rgba(255,255,255,0.12)" />
          <circle cx="70" cy="40" r="90" fill="rgba(217,249,157,0.10)" />
        </svg>

        {/* Боло: логотип ва фоиз */}
        <div className="absolute top-[7%] right-[6%] left-[6%] flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" aria-hidden className="h-7 w-7 shrink-0">
              <rect width="32" height="32" rx="10" fill="#fff" />
              <path d="M11 23V9h6.2a4.6 4.6 0 0 1 1 9.1L22 23" fill="none" stroke="#11a24f" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21.5 6.5c3 .2 4.3 2 4.2 4.6-2.8-.1-4.3-1.8-4.2-4.6z" fill="#7ad94a" />
            </svg>
            <span className="text-[15px] leading-none tracking-tight">
              <span className="font-black">RUDAKI</span>
              <span className="font-medium opacity-80">MARKET</span>
            </span>
          </span>
          {card && (
            <span className="rounded-full bg-white/18 px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm">
              {format(t.rate, { p: pct })}
            </span>
          )}
        </div>

        {/* Марказ: бонус */}
        <div className="absolute inset-x-[6%] top-[33%] text-center">
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase opacity-85">{t.bonus}</p>
          {card ? (
            <p className="mt-0.5 text-[clamp(30px,10vw,42px)] leading-tight font-extrabold tracking-tight tabular-nums">
              {nf.format(balance)} <span className="text-[0.6em] font-bold">{dict.product.currency}</span>
            </p>
          ) : (
            <span className="mx-auto mt-2 block h-9 w-40 animate-pulse rounded-xl bg-white/25" />
          )}
          {card && card.pending > 0 && (
            <p className="mt-0.5 text-xs font-semibold text-[#d9f99d]">{format(t.pending, { amount: `${nf.format(card.pending)} ${dict.product.currency}` })}</p>
          )}
        </div>

        {/* Поён: номи корт, рақам ва телефон */}
        <div className="absolute right-[6%] bottom-[8%] left-[6%] flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] leading-tight font-semibold">{t.title}</p>
            <p className="mt-0.5 truncate text-[13px] opacity-85 tabular-nums">{card ? formatPhone(card.phone) : " "}</p>
          </div>
          {card && <p className="shrink-0 text-[12px] font-semibold tracking-wider opacity-85 tabular-nums">{card.cardNumber}</p>}
        </div>
      </div>

      <p className="mt-3 px-1 text-center text-xs text-muted">{card ? format(t.hint, { p: pct }) : " "}</p>
    </div>
  );
}
