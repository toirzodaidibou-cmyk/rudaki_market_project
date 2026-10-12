import type { MetadataRoute } from "next";

/** PWA: сайт дар телефон ҳамчун барнома насб мешавад (иконаи RUDAKI MARKET дар экрани асосӣ, бе сатри браузер). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "RUDAKI MARKET",
    short_name: "RUDAKI",
    description: "Мағозаи онлайни хӯрокворӣ дар ноҳияи Рӯдакӣ — расонидан то дари хона.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f8f6",
    theme_color: "#11a24f",
    lang: "tg",
    categories: ["shopping", "food"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
