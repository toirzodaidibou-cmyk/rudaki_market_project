import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { InlineScript } from "@/components/InlineScript";
import { BottomNav } from "@/components/layout/BottomNav";
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

// Пеш аз расми саҳифа мавзӯъро (light/dark) муқаррар мекунад, то "дурахш" набошад.
// Тартиб: интихоби корбар дар localStorage → танзимоти система.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

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
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <InlineScript html={themeScript} />
      </head>
      {/* padding-и поён, то менюи поён мундариҷаро напӯшонад */}
      <body className="flex min-h-full flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-28">
        <I18nProvider locale={lang} dict={dict}>
          <CustomerProvider>
            <Navbar locale={lang} dict={dict} />
            {children}
            <BottomNav />
          </CustomerProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
