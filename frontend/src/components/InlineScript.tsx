"use client";

// Скрипти дохилӣ, ки танҳо аз HTML-и server иҷро мешавад.
// Бояд Client Component бошад: дар server type="text/javascript", дар браузер
// type="text/plain" — то React огоҳии "script tag" надиҳад
// (тибқи ҳуҷҷати Next.js: "Preventing flash before hydration").
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
