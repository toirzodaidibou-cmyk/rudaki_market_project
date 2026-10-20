import Image from "next/image";
import { fileUrl } from "@/lib/api";

/** Муқоваи маҷмӯа: суратҳои аслии то 4 моли он (2×2) дар плиткаи сафед. */
export function BundleCover({ images, className = "" }: { images: string[]; className?: string }) {
  const pics = images.slice(0, 4);
  return (
    <span
      aria-hidden
      className={`grid shrink-0 gap-0.5 overflow-hidden rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/5 ${pics.length > 1 ? "grid-cols-2" : ""} ${className}`}
    >
      {pics.map((src, i) => (
        <span key={i} className={`relative min-h-0 ${pics.length === 3 && i === 0 ? "row-span-2" : ""}`}>
          <Image src={fileUrl(src)!} alt="" fill unoptimized sizes="48px" className="object-contain" />
        </span>
      ))}
    </span>
  );
}
