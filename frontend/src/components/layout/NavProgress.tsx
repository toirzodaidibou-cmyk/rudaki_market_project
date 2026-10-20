"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Хати тунуки градиентӣ дар болои экран ҳангоми гузариш байни саҳифаҳо.
// Оғоз — клик ба пайванди дохилӣ ё "ба қафо/пеш"; анҷом — вақте ки URL иваз шуд.
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const url = `${pathname}?${searchParams.toString()}`;

  // URL-е, ки гузариш аз он оғоз шуд (null — гузариш нест).
  const [startedFrom, setStartedFrom] = useState<string | null>(null);
  const urlRef = useRef(url);
  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  useEffect(() => {
    const start = () => setStartedFrom(urlRef.current);

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const next = new URL(a.href, location.href);
      if (next.origin !== location.origin) return;
      if (next.pathname === location.pathname && next.search === location.search) return;
      start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
    };
  }, []);

  const phase = startedFrom === null ? "idle" : startedFrom === url ? "loading" : "done";

  useEffect(() => {
    if (phase === "idle") return;
    // "done" — пас аз пайдо шудани хати пурра пинҳон мешавад; "loading" — агар гузариш
    // ягон сабаб ба анҷом нарасад, хат абадӣ намемонад.
    const t = window.setTimeout(() => setStartedFrom(null), phase === "done" ? 450 : 10000);
    return () => window.clearTimeout(t);
  }, [phase]);

  return <div aria-hidden className="nav-progress" data-phase={phase} />;
}
