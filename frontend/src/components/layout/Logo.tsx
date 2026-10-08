export function Logo() {
  return (
    <span className="flex items-center gap-2 select-none">
      <svg
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="h-7 w-7 shrink-0 sm:h-8 sm:w-8"
      >
        <defs>
          <linearGradient id="rm-logo-gradient" x1="0" y1="0" x2="32" y2="32">
            <stop offset="0" stopColor="var(--brand-from)" />
            <stop offset="1" stopColor="var(--brand-to)" />
          </linearGradient>
        </defs>
        {/* Ҳалқаи кушода (мисли алиф), дар дохилаш ҳарфи R */}
        <path
          d="M27.5 21.5A13 13 0 1 1 26.4 8.2"
          stroke="url(#rm-logo-gradient)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M12.5 22V10.5h4.6a3.6 3.6 0 0 1 0 7.2h-4.6M16.6 17.7 20 22"
          stroke="url(#rm-logo-gradient)"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[18px] leading-none tracking-tight text-foreground sm:text-[21px]">
        <span className="font-extrabold">RUDAKI</span>
        <span className="font-normal">MARKET</span>
      </span>
    </span>
  );
}
