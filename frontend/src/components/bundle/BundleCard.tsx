import Image from "next/image";
import Link from "next/link";
import { ChevronRightIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import { format, localizePath } from "@/i18n/config";
import type { Dictionary } from "@/i18n/getDictionary";
import { fileUrl } from "@/lib/api";
import type { Bundle } from "@/lib/api";

// Рангҳои корт (ба навбат)
const GRADIENTS = [
  "linear-gradient(135deg, #fff4d6 0%, #ffd98a 100%)",
  "linear-gradient(135deg, #e6f0ff 0%, #b9d3ff 100%)",
  "linear-gradient(135deg, #ffe4ec 0%, #ffb8cc 100%)",
  "linear-gradient(135deg, #e5f8ec 0%, #aee8c4 100%)",
];

/** Корти маҷмӯа: emoji, ном, тавсиф, суратҳои молҳо, шумора ва нарх. */
export function BundleCard({ bundle, index, lang, dict }: { bundle: Bundle; index: number; lang: Locale; dict: Dictionary }) {
  const nf = new Intl.NumberFormat(lang === "en" ? "en-US" : "ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <Link
      href={localizePath(lang, `/bundle/${bundle.id}`)}
      className="group flex h-full flex-col rounded-[24px] p-4 text-[#1d1a2b] transition-transform active:scale-[0.98]"
      style={{ background: GRADIENTS[index % GRADIENTS.length] }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-4xl leading-none" aria-hidden>
          {bundle.emoji}
        </span>
        <div className="flex -space-x-3">
          {bundle.images.slice(0, 3).map((src) => (
            <span key={src} className="relative h-11 w-11 overflow-hidden rounded-full bg-white ring-2 ring-white/80">
              <Image src={fileUrl(src)!} alt="" fill unoptimized sizes="44px" className="object-contain p-1" />
            </span>
          ))}
        </div>
      </div>
      <h3 className="mt-3 text-lg leading-tight font-extrabold">{bundle.name[lang] || bundle.name.tg}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-[#1d1a2b]/70">{bundle.description[lang] || bundle.description.tg}</p>
      <div className="mt-auto flex items-center justify-between pt-3">
        <span className="text-sm">
          <span className="text-[#1d1a2b]/60">{format(dict.bundles.items, { n: String(bundle.itemCount) })} · </span>
          <span className="font-extrabold">
            {nf.format(bundle.total)} {dict.product.currency}
          </span>
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 transition-transform group-hover:translate-x-0.5">
          <ChevronRightIcon width={18} height={18} />
        </span>
      </div>
    </Link>
  );
}
