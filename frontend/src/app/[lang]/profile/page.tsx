import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileView } from "@/customer/ProfileView";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";

export async function generateMetadata({ params }: PageProps<"/[lang]/profile">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  // Саҳифаи шахсӣ — дар Google индекс намешавад
  return { title: `${dict.profile.title} — RUDAKI MARKET`, robots: { index: false } };
}

export default async function ProfilePage({ params }: PageProps<"/[lang]/profile">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 sm:px-6 sm:pt-6">
      <h1 className="mx-auto mb-4 max-w-3xl text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
        {dict.profile.title}
      </h1>
      <ProfileView />
    </main>
  );
}
