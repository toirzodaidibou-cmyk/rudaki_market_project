import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { InlineScript } from "@/components/InlineScript";
import { BottomNav } from "@/components/layout/BottomNav";
import { CartBar } from "@/components/layout/CartBar";
import { Navbar } from "@/components/layout/Navbar";
import { CustomerProvider } from "@/customer/CustomerProvider";
import { hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { I18nProvider } from "@/i18n/I18nProvider";
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
  const { meta } = await getDictionary(lang);
  return { title: meta.title, description: meta.description };
}

// viewportFit: "cover" — то менюи поён дар iPhone safe-area-ро ба ҳисоб гирад.
export const viewport: Viewport = {
  viewportFit: "cover",
};

// Пеш аз расми саҳифа мавзӯъ (light/dark) ва дизайнро (1/2/3) муқаррар мекунад, то "дурахш" набошад.
// Мавзӯъ: интихоби корбар дар localStorage → танзимоти система. Дизайн: localStorage → 1.
const themeScript = `(function(){var r=document.documentElement;try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}r.setAttribute("data-theme",t);var d=localStorage.getItem("design");if(d==="2"||d==="3")r.setAttribute("data-design",d)}catch(e){}})()`;

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
      {/* padding-и поён, то менюи поён (ва дар дизайни 2 — панели сабад) мундариҷаро напӯшонад */}
      <body className="flex min-h-full flex-col pb-[calc(6.5rem+env(safe-area-inset-bottom))] d2:pb-[calc(10.5rem+env(safe-area-inset-bottom))] md:pb-28 md:d2:pb-28">
        <I18nProvider locale={lang} dict={dict}>
          <CustomerProvider>
            <Navbar locale={lang} dict={dict} />
            {children}
            <CartBar />
            <BottomNav />
          </CustomerProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
