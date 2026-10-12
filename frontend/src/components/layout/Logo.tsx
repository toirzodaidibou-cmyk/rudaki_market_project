/**
 * Логотип: ҳарфи R бо нишонаи ҳар дизайн — 1: квадрати сабз бо барг, 3: доираи минтагӣ.
 * Ҳарду рендер мешаванд ва CSS (d3) якеро нишон медиҳад.
 */
export function Logo({ ink = "text-header-ink" }: { ink?: string }) {
  const mark = "h-8 w-8 shrink-0 sm:h-9 sm:w-9";
  return (
    <span className="flex items-center gap-2 select-none">
      <svg viewBox="0 0 32 32" aria-hidden="true" className={`${mark} d3:hidden`}>
        <rect width="32" height="32" rx="10" fill="#11a24f" />
        <path
          d="M11 23V9h6.2a4.6 4.6 0 0 1 1 9.1L22 23"
          fill="none"
          stroke="#fff"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M21.5 6.5c3 .2 4.3 2 4.2 4.6-2.8-.1-4.3-1.8-4.2-4.6z" fill="#d9f99d" />
      </svg>
      <svg viewBox="0 0 32 32" aria-hidden="true" className={`${mark} hidden d3:block`}>
        <defs>
          <linearGradient id="rm-logo-mint" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5be39b" />
            <stop offset="1" stopColor="#159a57" />
          </linearGradient>
        </defs>
        <path d="M16 3C24 3 29 8 29 16c0 8-5 13-13 13S3 24 3 16 8 3 16 3z" fill="url(#rm-logo-mint)" />
        <path
          d="M11.5 22.5v-13h5.6a4.2 4.2 0 0 1 .9 8.3l3.5 4.7"
          fill="none"
          stroke="#fff"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`text-[17px] leading-none tracking-tight sm:text-[21px] ${ink}`}>
        <span className="font-black">RUDAKI</span>
        <span className="font-medium opacity-75">MARKET</span>
      </span>
    </span>
  );
}
