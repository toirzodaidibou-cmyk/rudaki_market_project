"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCustomer } from "@/customer/CustomerProvider";
import { format, localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { clientApi } from "@/lib/clientApi";

/** "Ҳамаашро ба сабад": агар ворид нашуда бошад — аввал даромад; баъд → саҳифаи сабад. */
export function AddBundleButton({ bundleId, label }: { bundleId: number; label: string }) {
  const { locale, dict } = useI18n();
  const t = dict.bundles;
  const { requireLogin, refreshCart } = useCustomer();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setNote(null);
    try {
      const r = await clientApi.addBundle(bundleId);
      await refreshCart();
      if (r.unavailable.length > 0) setNote(format(t.unavailable, { names: r.unavailable.join(", ") }));
      setTimeout(() => router.push(localizePath(locale, "/cart")), r.unavailable.length > 0 ? 2500 : 400);
      setNote((n) => n ?? t.added);
    } catch {
      setNote(t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => requireLogin(() => void add())}
        disabled={busy}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-base font-bold text-on-accent shadow-lg shadow-accent/30 transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-70"
      >
        {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <ShoppingCart size={20} strokeWidth={2.4} aria-hidden />}
        {label}
      </button>
      {note && (
        <p role="status" className="mt-2 text-center text-sm font-medium text-foreground">
          {note}
        </p>
      )}
    </div>
  );
}
