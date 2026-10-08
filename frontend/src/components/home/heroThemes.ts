// Рангҳои тайёри слайдҳо (номҳо бо backend BannerService.Themes мувофиқ). Чап — торик/равшан барои матн.
export type HeroTone = "dark" | "light";

export const HERO_THEMES: Record<string, { background: string; tone: HeroTone }> = {
  red: { background: "linear-gradient(115deg, #6e0710 0%, #c40f1b 48%, #ff4b4b 100%)", tone: "dark" },
  yellow: { background: "linear-gradient(115deg, #fff3cf 0%, #fdc95c 52%, #f3972a 100%)", tone: "light" },
  pink: { background: "linear-gradient(115deg, #44102f 0%, #962c5f 50%, #f18cb5 100%)", tone: "dark" },
  blue: { background: "linear-gradient(115deg, #142a72 0%, #2563eb 50%, #6ccbff 100%)", tone: "dark" },
  lavender: { background: "linear-gradient(115deg, #f2f7ff 0%, #dde6ff 50%, #fbd0e5 100%)", tone: "light" },
  green: { background: "linear-gradient(115deg, #0b3d2a 0%, #15803d 50%, #6ee7a8 100%)", tone: "dark" },
  orange: { background: "linear-gradient(115deg, #7a2e00 0%, #ea580c 50%, #ffb36b 100%)", tone: "dark" },
  dark: { background: "linear-gradient(115deg, #111111 0%, #2a2440 50%, #5b4b8a 100%)", tone: "dark" },
};

export const heroTheme = (name: string) => HERO_THEMES[name] ?? HERO_THEMES.yellow;
