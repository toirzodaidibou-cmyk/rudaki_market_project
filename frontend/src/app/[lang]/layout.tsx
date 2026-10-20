import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InlineScript } from "@/components/InlineScript";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { NavProgress } from "@/components/layout/NavProgress";
import { PwaRegister } from "@/components/layout/Pwa";
import { CustomerProvider } from "@/customer/CustomerProvider";
import { hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { I18nProvider } from "@/i18n/I18nProvider";
import { SITE_URL } from "@/lib/seo";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
});

// Ҳар 4 забон пешакӣ (static) сохта мешаванд.
export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const { meta, info } = await getDictionary(lang);
  return {
    // Пайвандҳои пурра барои og:image, canonical ва hreflang
    metadataBase: new URL(SITE_URL),
    title: meta.title,
    description: info.tagline,
    applicationName: "RUDAKI MARKET",
    openGraph: { siteName: "RUDAKI MARKET", type: "website", locale: lang },
  };
}

// viewportFit: "cover" — то менюи поён дар iPhone safe-area-ро ба ҳисоб гирад.
// themeColor — ранги сатри болои браузер/барнома (PWA) дар мавзӯи равшан ва торик.
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f8f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0b120e" },
  ],
};

// Пеш аз расми саҳифа мавзӯъ (light/dark) ва дизайнро (1/3) муқаррар мекунад, то "дурахш" набошад.
// Мавзӯъ: интихоби корбар дар localStorage → танзимоти система. Дизайн: localStorage → 1
// (дизайни 2-и хориҷшуда ё қимати дигар → 1).
const themeScript = `(function(){var r=document.documentElement;try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}r.setAttribute("data-theme",t);if(localStorage.getItem("design")==="3")r.setAttribute("data-design","3")}catch(e){}})()`;

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <html
      lang={lang}
      data-theme="light"
      data-design="1"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <InlineScript html={themeScript} />
      </head>
      {/* padding-и поён, то менюи поён мундариҷаро напӯшонад */}
      <body className="flex min-h-full flex-col pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-28">
        <I18nProvider locale={lang} dict={dict}>
          <CustomerProvider>
            <Suspense fallback={null}>
              <NavProgress />
            </Suspense>
            <Navbar locale={lang} dict={dict} />
            {children}
            <Footer lang={lang} dict={dict} />
            <PwaRegister />
            <BottomNav />
          </CustomerProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
