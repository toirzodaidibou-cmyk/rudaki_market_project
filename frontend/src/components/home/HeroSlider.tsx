"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { format, localizePath } from "@/i18n/config";
import type { Dictionary } from "@/i18n/getDictionary";
import { useI18n } from "@/i18n/I18nProvider";
import { heroTheme } from "./heroThemes";
import type { HeroTone } from "./heroThemes";

type SlideKey = keyof Dictionary["hero"]["slides"];

/** Слайди тайёр барои намоиш (аз админ ё пешфарз). */
export type HeroSlide = {
  id: string;
  image: string;
  href: string;
  background: string;
  /** dark — матни сафед; light — матни торик */
  tone: HeroTone;
  badge: string;
  title: string;
  text: string;
  /** Холӣ — "Харидан" аз луғат */
  cta: string;
};

// Пешфарз (агар дар админ слайд набошад ё сервер ҷавоб надиҳад): public/banners/*.webp
const FALLBACK: { key: SlideKey; theme: string; href: string }[] = [
  { key: "drinks", theme: "red", href: "/catalog/drinks" },
  { key: "waffles", theme: "yellow", href: "/catalog/cookies" },
  { key: "cakes", theme: "pink", href: "/catalog/cookies" },
  { key: "detergents", theme: "blue", href: "/catalog/perfumery" },
  { key: "baby", theme: "lavender", href: "/catalog/baby" },
];

const AUTOPLAY_MS = 3000;

const toneClasses = {
  dark: {
    text: "text-white",
    sub: "text-white/80",
    badge: "bg-white/15 text-white ring-1 ring-white/25",
    cta: "bg-white text-[#111] hover:bg-white/90",
    glow: "bg-white/20",
    ring: "border-white/25",
    dots: "bg-[radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)]",
  },
  light: {
    text: "text-[#1d1a2b]",
    sub: "text-[#1d1a2b]/70",
    badge: "bg-black/5 text-[#1d1a2b] ring-1 ring-black/10",
    cta: "bg-[#111] text-white hover:bg-[#222]",
    glow: "bg-white/60",
    ring: "border-black/10",
    dots: "bg-[radial-gradient(rgba(0,0,0,0.08)_1px,transparent_1px)]",
  },
};

/** slides — аз админ (саҳифаи асосӣ мегирад); холӣ — пешфарз. */
export function HeroSlider({ slides: fromAdmin }: { slides?: HeroSlide[] }) {
  const { locale, dict } = useI18n();
  const t = dict.hero;
  const slides: HeroSlide[] =
    fromAdmin && fromAdmin.length > 0
      ? fromAdmin
      : FALLBACK.map((f) => ({
          id: f.key,
          image: `/banners/${f.key}.webp`,
          href: f.href,
          ...heroTheme(f.theme),
          ...t.slides[f.key],
          cta: "",
        }));
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 30 });

  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(false); // мушак болои слайдер (танҳо компютер)
  const [dragging, setDragging] = useState(false); // корбар слайдро мекашад
  const running = !hovered && !dragging;

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    const onDown = () => setDragging(true);
    const onUp = () => setDragging(false);
    emblaApi.on("select", onSelect).on("pointerDown", onDown).on("pointerUp", onUp);
    return () => {
      emblaApi.off("select", onSelect).off("pointerDown", onDown).off("pointerUp", onUp);
    };
  }, [emblaApi]);

  // Autoplay: ҳар 3 сония слайди навбатӣ. Баъд аз ҳар иваз (ё swipe) таймер аз нав сар мешавад.
  useEffect(() => {
    if (!emblaApi || !running) return;
    const id = window.setTimeout(() => emblaApi.scrollNext(), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [emblaApi, running, selected]);

  // Суратҳо: аввал танҳо слайди 1; слайди ҷорӣ фавран, слайди навбатӣ — 1 сония баъд (то autoplay
  // омода бошад). Бе ин ҳамаи баннерҳо (~0.5 МБ) якбора бор мешуданд.
  const [loaded, setLoaded] = useState<ReadonlySet<number>>(() => new Set([0]));
  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = (selected + 1) % slides.length;
      setLoaded((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [selected, slides.length]);

  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t.label}
      className="group/hero relative"
      // Танҳо мушак: дар телефон "mouseenter" баъд аз ламс мемонад ва autoplay меистод.
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
      }}
    >
      <div ref={emblaRef} className="overflow-hidden rounded-[28px]">
        <div className="flex touch-pan-y">
          {slides.map((slide, i) => {
            const active = i === selected;
            const tone = toneClasses[slide.tone];
            return (
              <div
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={format(t.slideOf, { n: String(i + 1), total: String(slides.length) })}
                aria-hidden={!active}
                data-active={active}
                className="group/slide relative h-[210px] min-w-0 flex-[0_0_100%] overflow-hidden sm:h-[280px] md:h-[340px] lg:h-[380px]"
                style={{ background: slide.background }}
              >
                {/* Ороиш: нуқтаҳо, нури мулоим ва ҳалқаҳо дар паси мол */}
                <div
                  aria-hidden
                  className={`absolute inset-0 ${tone.dots} [background-size:18px_18px] [mask-image:linear-gradient(90deg,black,transparent_70%)]`}
                />
                <div
                  aria-hidden
                  className={`absolute top-1/2 right-[6%] aspect-square h-[115%] -translate-y-1/2 rounded-full blur-3xl ${tone.glow}`}
                />
                <div
                  aria-hidden
                  className={`absolute top-1/2 right-[10%] aspect-square h-[92%] -translate-y-1/2 rounded-full border-2 ${tone.ring} transition-transform duration-[1200ms] group-data-[active=false]/slide:scale-75 group-data-[active=true]/slide:scale-100`}
                />
                <div
                  aria-hidden
                  className={`absolute top-1/2 right-[2%] aspect-square h-[125%] -translate-y-1/2 rounded-full border ${tone.ring} opacity-60`}
                />

                {/* Мол */}
                <div className="absolute right-0 bottom-0 h-[96%] w-[60%] transition-all duration-700 ease-out group-data-[active=false]/slide:translate-x-6 group-data-[active=false]/slide:scale-90 sm:w-[56%] md:right-[2%] md:w-[52%]">
                  <div className="relative h-full w-full motion-safe:animate-hero-float">
                    {(active || loaded.has(i)) && (
                      <Image
                        src={slide.image}
                        // Сурат аз API (localhost ё /backend) — бе оптимизатсияи Next (суратҳо аллакай WebP ва хурд)
                        unoptimized={!slide.image.startsWith("/banners/")}
                        alt={slide.title}
                        fill
                        sizes="(min-width: 1280px) 640px, (min-width: 768px) 52vw, 60vw"
                        preload={i === 0}
                        loading={i === 0 ? undefined : "eager"}
                        className="object-contain object-bottom"
                      />
                    )}
                  </div>
                </div>

                {/* Матн */}
                <div className="relative z-10 flex h-full max-w-[52%] flex-col justify-center gap-2 pl-5 sm:max-w-[48%] sm:gap-3 sm:pl-10 md:pl-14 lg:pl-16">
                  <span
                    className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase backdrop-blur sm:px-3 sm:text-xs ${tone.badge} transition-all duration-500 group-data-[active=false]/slide:translate-y-3 group-data-[active=false]/slide:opacity-0`}
                  >
                    {slide.badge}
                  </span>
                  <h2
                    className={`text-[22px] leading-[1.1] font-extrabold tracking-tight text-balance sm:text-4xl md:text-5xl ${tone.text} transition-all delay-100 duration-500 group-data-[active=false]/slide:translate-y-4 group-data-[active=false]/slide:opacity-0`}
                  >
                    {slide.title}
                  </h2>
                  <p
                    className={`hidden max-w-sm text-sm sm:block md:text-base ${tone.sub} transition-all delay-200 duration-500 group-data-[active=false]/slide:translate-y-4 group-data-[active=false]/slide:opacity-0`}
                  >
                    {slide.text}
                  </p>
                  <Link
                    href={localizePath(locale, slide.href)}
                    tabIndex={active ? 0 : -1}
                    className={`mt-1 w-fit rounded-full px-4 py-2 text-xs font-bold shadow-lg shadow-black/10 transition-all delay-300 duration-500 hover:scale-[1.04] active:scale-95 sm:mt-2 sm:px-6 sm:py-3 sm:text-sm ${tone.cta} group-data-[active=false]/slide:translate-y-4 group-data-[active=false]/slide:opacity-0`}
                  >
                    {slide.cta || t.cta} →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Тирчаҳо (танҳо дар компютер, ҳангоми hover) */}
      <ArrowButton side="left" label={t.prev} onClick={prev} />
      <ArrowButton side="right" label={t.next} onClick={next} />

    </section>
  );
}

function ArrowButton({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[#111] opacity-0 shadow-lg backdrop-blur transition-all duration-300 group-hover/hero:opacity-100 hover:scale-110 hover:bg-white focus-visible:opacity-100 md:flex ${
        side === "left" ? "left-4" : "right-4"
      }`}
    >
      <Icon width={20} height={20} strokeWidth={2.4} />
    </button>
  );
}
