"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

const LIMIT = 280;

/** Таркиб/тавсиф: агар дароз бошад — "Бештар / Камтар". */
export function ProductDescription({ text }: { text: string }) {
  const { dict } = useI18n();
  const [open, setOpen] = useState(false);
  const long = text.length > LIMIT;
  return (
    <div>
      <p className="text-[15px] leading-7 whitespace-pre-line text-foreground/85">
        {long && !open ? `${text.slice(0, LIMIT).trimEnd()}…` : text}
      </p>
      {long && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 text-sm font-semibold text-foreground underline underline-offset-4">
          {open ? dict.productPage.less : dict.productPage.more}
        </button>
      )}
    </div>
  );
}
