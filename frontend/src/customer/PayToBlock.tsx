"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { PaymentLogo } from "@/customer/PaymentLogo";
import { format } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { formatPhone } from "@/lib/clientApi";
import type { PayTo } from "@/lib/clientApi";

// Барномаи Алиф: дар Android — бо intent кушода мешавад (агар насб набошад — Google Play), дар iPhone — App Store
// (агар насб бошад, App Store тугмаи «Кушодан» нишон медиҳад). Рақам ва маблағро бонк ба пайванд қабул намекунад.
const ALIF_ANDROID =
  "intent://#Intent;package=tj.alif.mobi;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dtj.alif.mobi;end";
const ALIF_IOS = "https://apps.apple.com/tj/app/id1331374853";

/** Пардохт бо Алиф / DC / Корти Миллӣ: гиранда, рақам, маблағ ва шарҳ — ҳар кадом бо тугмаи «Нусха». */
export function PayToBlock({ payTo, label }: { payTo: PayTo; label: string }) {
  const { locale, dict } = useI18n();
  const tc = dict.checkout;
  const [copied, setCopied] = useState<string | null>(null);
  const nf = new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Барои барномаи бонк: рақами бе фосила ва маблағ бо нуқта (на вергул)
  const phoneDigits = payTo.phone.replace(/\s/g, "");
  const amountPlain = payTo.amount.toFixed(2);

  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Браузер иҷозат надод — матн дар экран ҳаст, дастӣ нусха гирифтан мумкин
      return;
    }
    setCopied(key);
    window.setTimeout(() => setCopied((k) => (k === key ? null : k)), 1800);
  }

  const rows: { key: string; title: string; shown: string; value: string; big?: boolean }[] = [
    { key: "phone", title: tc.payPhone, shown: formatPhone(payTo.phone), value: phoneDigits, big: true },
    { key: "amount", title: tc.payAmount, shown: `${nf.format(payTo.amount)} ${dict.product.currency}`, value: amountPlain, big: true },
    { key: "comment", title: tc.payComment, shown: payTo.comment, value: payTo.comment },
  ];

  const isIos = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <div className="mt-5 rounded-2xl border-2 border-accent/30 bg-accent/5 p-4 text-left motion-safe:animate-menu-in">
      <div className="flex items-center gap-3">
        <PaymentLogo method={payTo.method} size={40} />
        <div className="min-w-0">
          <p className="font-bold text-foreground">{format(tc.payTitle, { method: label })}</p>
          <p className="text-xs text-muted">
            {tc.payRecipient}: <b className="text-foreground">{payTo.recipient}</b>
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{r.title}</p>
              <p className={`truncate text-foreground tabular-nums ${r.big ? "text-lg font-extrabold" : "font-semibold"}`}>{r.shown}</p>
            </div>
            <button
              type="button"
              onClick={() => void copy(r.key, r.value)}
              className={`flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition-all active:scale-95 ${
                copied === r.key ? "bg-[#1f9d55] text-white" : "bg-accent text-on-accent"
              }`}
            >
              {copied === r.key ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={2.4} />}
              {copied === r.key ? tc.copied : tc.copy}
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-muted">{tc.payHowTo}</p>

      {payTo.method === "alif" && (
        <a
          href={isIos ? ALIF_IOS : ALIF_ANDROID}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#00af66] font-bold text-white transition-all hover:brightness-95 active:scale-[0.98]"
        >
          <ExternalLink size={18} strokeWidth={2.4} />
          {tc.openAlif}
        </a>
      )}
    </div>
  );
}
