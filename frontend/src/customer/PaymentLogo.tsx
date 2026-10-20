import { Banknote } from "lucide-react";
import Image from "next/image";

// Логотипҳои аслии ширкатҳо (аз сайтҳои расмӣ: alif.tj, dc.tj, kortimilli.tj) — public/payments.
const LOGOS: Record<string, string> = {
  alif: "/payments/alif.svg",
  dc: "/payments/dc.svg",
  korti_milli: "/payments/korti-milli.svg",
};

/** Нишонаи тарзи пардохт дар "плиткаи" сафед (дар мавзӯи торик ҳам логотип равшан менамояд). */
export function PaymentLogo({ method, size = 32 }: { method: string; size?: number }) {
  const src = LOGOS[method];
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, padding: Math.round(size * 0.12) }}
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[28%] bg-white text-[#0b7f3d] shadow-sm ring-1 ring-black/5"
    >
      {src ? (
        <Image src={src} alt="" width={size} height={size} unoptimized className="h-full w-full object-contain" />
      ) : (
        <Banknote className="h-full w-full" strokeWidth={2} />
      )}
    </span>
  );
}
