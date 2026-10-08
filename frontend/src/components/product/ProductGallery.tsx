"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { BadgeIcon } from "@/components/ui/icons";
import { format } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";

/** Суратҳои саҳифаи мол: варақзанӣ бо ангушт (scroll-snap), нуқтаҳо ва суратҳои хурд дар поён. */
export function ProductGallery({
  images,
  name,
  discount,
  isNew,
}: {
  images: { url: string; thumb: string }[];
  name: string;
  discount: number;
  isNew: boolean;
}) {
  const { dict } = useI18n();
  const [slide, setSlide] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const go = (i: number) => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: "smooth" });

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[28px] bg-white ring-1 ring-black/[0.06] ring-inset dark:ring-white/10">
        <div
          ref={track}
          className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        >
          {(images.length ? images : [null]).map((img, i) => (
            <div key={img?.url ?? i} className="relative h-full w-full shrink-0 snap-center">
              {img && (
                <Image
                  src={img.url}
                  alt={i === 0 ? name : format(dict.productPage.photo, { n: String(i + 1) })}
                  fill
                  unoptimized
                  preload={i === 0}
                  loading={i === 0 ? "eager" : "lazy"}
                  sizes="(min-width: 1024px) 560px, 100vw"
                  className="object-contain p-6 sm:p-10"
                />
              )}
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute top-4 left-4 flex flex-col items-start gap-2">
          {discount > 0 && (
            <span className="rounded-xl bg-[#ff3b5c] px-2.5 py-1 text-base font-extrabold text-white shadow-sm">−{discount}%</span>
          )}
          {isNew && (
            <span className="flex items-center gap-1.5 rounded-full bg-[#9b3dff] py-1 pr-3 pl-2 text-sm font-medium text-white">
              <BadgeIcon width={16} height={16} />
              {dict.product.isNew}
            </span>
          )}
        </div>

        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden">
            {images.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === slide ? "w-5 bg-accent" : "w-1.5 bg-black/20"}`} />
            ))}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 hidden gap-2 sm:flex">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => go(i)}
              aria-label={format(dict.productPage.photo, { n: String(i + 1) })}
              aria-current={i === slide}
              className={`relative h-20 w-20 overflow-hidden rounded-2xl bg-white ring-2 transition-all ${
                i === slide ? "ring-accent" : "ring-transparent hover:ring-border"
              }`}
            >
              <Image src={img.thumb} alt="" fill unoptimized sizes="80px" className="object-contain p-1.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
