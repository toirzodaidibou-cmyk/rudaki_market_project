"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { XIcon } from "@/components/ui/icons";
import { useI18n } from "@/i18n/I18nProvider";
import type { ListOptions, Sort } from "@/lib/api";
import { listHref } from "@/lib/listParams";

/**
 * Тартиб (чипҳо) ва филтри нарх барои каталог ва ҷустуҷӯ. Ҳолат дар URL нигоҳ дошта мешавад,
 * бинобар ин пайвандро фиристодан ё "қафо" задан кор мекунад.
 */
export function ListToolbar({ opts, relevance = false }: { opts: ListOptions; relevance?: boolean }) {
  const { dict } = useI18n();
  const ts = dict.sort;
  const tf = dict.filter;
  const pathname = usePathname();
  const router = useRouter();
  const [priceOpen, setPriceOpen] = useState(false);
  const [min, setMin] = useState(opts.min ? String(opts.min) : "");
  const [max, setMax] = useState(opts.max ? String(opts.max) : "");

  const sorts: { key: Sort | undefined; label: string }[] = [
    { key: undefined, label: relevance ? ts.relevance : ts.new },
    ...(relevance ? [{ key: "new" as const, label: ts.new }] : []),
    { key: "cheap", label: ts.cheap },
    { key: "expensive", label: ts.expensive },
    { key: "discount", label: ts.discount },
  ];
  const hasPrice = Boolean(opts.min || opts.max);
  const chip = (active: boolean) =>
    `flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors ${
      active ? "bg-foreground text-background" : "bg-surface text-foreground hover:bg-surface-hover"
    }`;

  function applyPrice(e: React.FormEvent) {
    e.preventDefault();
    const num = (v: string) => {
      const n = Number(v.replace(",", "."));
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    let lo = num(min);
    let hi = num(max);
    if (lo && hi && lo > hi) [lo, hi] = [hi, lo];
    setPriceOpen(false);
    router.push(listHref(pathname, { ...opts, min: lo, max: hi }));
  }

  return (
    <div className="mb-5">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <button type="button" onClick={() => setPriceOpen((v) => !v)} aria-expanded={priceOpen} className={chip(hasPrice || priceOpen)}>
          {tf.price}
          {hasPrice && (
            <span className="tabular-nums">
              {opts.min ? `${tf.from} ${opts.min}` : ""} {opts.max ? `${tf.to} ${opts.max}` : ""}
            </span>
          )}
        </button>
        <span aria-hidden className="mx-1 my-2 w-px shrink-0 bg-border" />
        {sorts.map((s) => (
          <Link
            key={s.key ?? "default"}
            href={listHref(pathname, { ...opts, sort: s.key })}
            scroll={false}
            aria-current={opts.sort === s.key ? "true" : undefined}
            className={chip(opts.sort === s.key)}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {priceOpen && (
        <form onSubmit={applyPrice} className="mt-3 flex flex-wrap items-end gap-2 rounded-2xl bg-surface p-3 motion-safe:animate-menu-in">
          <label className="flex min-w-24 flex-1 flex-col gap-1 text-xs text-muted">
            {tf.from}
            <input
              inputMode="decimal"
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder="0"
              className="h-11 rounded-xl border-2 border-border bg-background px-3 text-base text-foreground outline-none focus:border-accent"
            />
          </label>
          <label className="flex min-w-24 flex-1 flex-col gap-1 text-xs text-muted">
            {tf.to}
            <input
              inputMode="decimal"
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder="1000"
              className="h-11 rounded-xl border-2 border-border bg-background px-3 text-base text-foreground outline-none focus:border-accent"
            />
          </label>
          <button type="submit" className="h-11 rounded-xl bg-accent px-5 font-semibold text-on-accent active:scale-95">
            {tf.apply}
          </button>
          {hasPrice && (
            <Link
              href={listHref(pathname, { ...opts, min: undefined, max: undefined })}
              onClick={() => { setMin(""); setMax(""); setPriceOpen(false); }}
              aria-label={tf.reset}
              title={tf.reset}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-background text-muted hover:text-foreground"
            >
              <XIcon width={18} height={18} />
            </Link>
          )}
        </form>
      )}
    </div>
  );
}
