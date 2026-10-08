import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CartView } from "@/customer/CartView";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";

export async function generateMetadata({ params }: PageProps<"/[lang]/cart">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  // Саҳифаи шахсӣ — дар Google индекс намешавад
  return { title: `${dict.cart.title} — RUDAKI MARKET`, robots: { index: false } };
}

export default async function CartPage({ params }: PageProps<"/[lang]/cart">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 sm:px-6 sm:pt-6">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">{dict.cart.title}</h1>
      <CartView />
    </main>
  );
}
