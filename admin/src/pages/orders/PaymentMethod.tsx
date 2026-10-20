import { Banknote } from 'lucide-react'
import { PAYMENT } from './status'

// Логотипҳои аслии ширкатҳо (аз сайтҳои расмӣ: alif.tj, dc.tj, kortimilli.tj) — public/payments
const LOGOS: Record<string, string> = {
  alif: '/payments/alif.svg',
  dc: '/payments/dc.svg',
  korti_milli: '/payments/korti-milli.svg',
}

/** Логотипи тарзи пардохт дар плиткаи сафед. */
export function PaymentLogo({ method, size = 22 }: { method: string; size?: number }) {
  const src = LOGOS[method]
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, padding: Math.round(size * 0.12) }}
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[28%] bg-white text-emerald-700 shadow-sm ring-1 ring-black/5"
    >
      {src ? <img src={src} alt="" className="h-full w-full object-contain" /> : <Banknote className="h-full w-full" strokeWidth={2} />}
    </span>
  )
}

/** Логотип + ном: «[Алиф] Алиф». */
export function PaymentMethod({ method, size }: { method: string; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <PaymentLogo method={method} size={size} />
      {PAYMENT[method] ?? method}
    </span>
  )
}
