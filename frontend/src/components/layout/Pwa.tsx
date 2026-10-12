"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

/** Сабти service worker (танҳо дар production — дар dev кэш халал мерасонад). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Браузер дастгирӣ намекунад ё манъ аст — сайт мисли пештар кор мекунад
    });
  }, []);
  return null;
}

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * «📲 Насб кардани барнома» — танҳо вақте ки браузер насбро пешниҳод мекунад (Chrome/Edge/Samsung, Android ва компютер).
 * Дар iPhone ва вақте ки аллакай насб шудааст — пинҳон.
 */
export function InstallAppButton() {
  const { dict } = useI18n();
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!prompt) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        await prompt.prompt();
        await prompt.userChoice;
        setPrompt(null);
      }}
      className="mt-4 inline-flex items-center gap-2 rounded-btn bg-accent px-4 py-2.5 text-sm font-bold text-on-accent shadow-[0_8px_18px_-10px_var(--accent-glow)] transition-transform active:scale-95"
    >
      {dict.info.install}
    </button>
  );
}
