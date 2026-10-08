import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function MapPinIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7.5" />
      <path d="m20.5 20.5-4.2-4.2" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function GlobeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 20.3c-.3 0-.5-.1-.8-.3C8.6 18.3 3 14.2 3 9.3 3 6.4 5.2 4.2 8 4.2c1.7 0 3.1.8 4 2.1.9-1.3 2.3-2.1 4-2.1 2.8 0 5 2.2 5 5.1 0 4.9-5.6 9-8.2 10.7-.3.2-.5.3-.8.3Z" />
    </svg>
  );
}

/** Нишонаи "Нав" — гули хурд (мисли намуна) */
export function BadgeIcon(props: IconProps) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M12 2.5c1 0 1.8.6 2.3 1.4.9-.3 1.9-.2 2.6.5s.8 1.7.5 2.6c.8.5 1.4 1.3 1.4 2.3s-.6 1.8-1.4 2.3c.3.9.2 1.9-.5 2.6s-1.7.8-2.6.5c-.5.8-1.3 1.4-2.3 1.4s-1.8-.6-2.3-1.4c-.9.3-1.9.2-2.6-.5s-.8-1.7-.5-2.6C5.8 11.1 5.2 10.3 5.2 9.3S5.8 7.5 6.6 7c-.3-.9-.2-1.9.5-2.6s1.7-.8 2.6-.5c.5-.8 1.3-1.4 2.3-1.4ZM8.5 17.2 7.5 21.5l4.5-2 4.5 2-1-4.3c-1 .5-2.1.8-3.5.8s-2.5-.3-3.5-.8Z" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

// --- Иконаҳои пур (filled) барои менюи поён ---

const solid: IconProps = {
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "currentColor",
  fillRule: "evenodd",
  clipRule: "evenodd",
  "aria-hidden": true,
};

export function HomeSolidIcon(props: IconProps) {
  return (
    <svg {...solid} {...props}>
      <path d="M10.6 2.9a2.2 2.2 0 0 1 2.8 0l7 5.7c.5.4.8 1 .8 1.7V19a2.5 2.5 0 0 1-2.5 2.5h-3.2V17a3.5 3.5 0 0 0-7 0v4.5H5.3A2.5 2.5 0 0 1 2.8 19v-8.7c0-.7.3-1.3.8-1.7l7-5.7Z" />
    </svg>
  );
}

export function CatalogSolidIcon(props: IconProps) {
  return (
    <svg {...solid} {...props}>
      <rect x="6" y="2.5" width="12" height="4" rx="1.6" />
      <rect x="4" y="8" width="16" height="4.2" rx="1.6" />
      <path d="M5 13.7h14a2 2 0 0 1 2 2v3.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3.8a2 2 0 0 1 2-2Zm4.6 2.4a.9.9 0 0 0 0 1.8h4.8a.9.9 0 0 0 0-1.8H9.6Z" />
    </svg>
  );
}

export function CartSolidIcon(props: IconProps) {
  return (
    <svg {...solid} {...props}>
      <path
        d="M7 8.5 9.4 3.8M17 8.5l-2.4-4.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="2" y="8" width="20" height="3.4" rx="1.7" />
      <path d="M3.6 12.8h16.8l-1.3 6.2a3 3 0 0 1-2.9 2.5H7.8a3 3 0 0 1-2.9-2.5l-1.3-6.2Zm5.9 1.9a1 1 0 0 0-1 1v2.6a1 1 0 0 0 2 0v-2.6a1 1 0 0 0-1-1Zm5 0a1 1 0 0 0-1 1v2.6a1 1 0 0 0 2 0v-2.6a1 1 0 0 0-1-1Z" />
    </svg>
  );
}

export function HeartSolidIcon(props: IconProps) {
  return (
    <svg {...solid} {...props}>
      <path d="M12 20.6c-.3 0-.6-.1-.9-.3C8.4 18.5 2.5 14.2 2.5 9.1 2.5 6.1 4.8 3.7 7.7 3.7c1.8 0 3.3.9 4.3 2.3 1-1.4 2.5-2.3 4.3-2.3 2.9 0 5.2 2.4 5.2 5.4 0 5.1-5.9 9.4-8.6 11.2-.3.2-.6.3-.9.3Z" />
    </svg>
  );
}

export function ProfileSolidIcon(props: IconProps) {
  return (
    <svg {...solid} {...props}>
      <path d="M12 1.8a10.2 10.2 0 1 1 0 20.4 10.2 10.2 0 0 1 0-20.4Zm0 4.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Zm0 8.9c-2.6 0-4.8 1.2-5.9 3.1a8.2 8.2 0 0 0 11.8 0c-1.1-1.9-3.3-3.1-5.9-3.1Z" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
