import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { InstallAppButton } from "@/components/layout/Pwa";
import { ClockIcon } from "@/components/ui/icons";
import { STORE_CONTACT } from "@/config/store";
import { format, localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/getDictionary";

/** Поёни саҳифа: логотип, соатҳои кор, пайвандҳо ва тамос (бо ранги дизайни ҷорӣ). */
export function Footer({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const t = dict.info;
  const link = "text-sm text-muted transition-colors hover:text-foreground";
  const head = "mb-3 text-xs font-bold tracking-wider text-foreground uppercase";
  const hours = `${STORE_CONTACT.open}–${STORE_CONTACT.close}`;

  return (
    <footer className="mt-14 border-t border-border bg-card/70 backdrop-blur">
      {/* Телефон: логотип ва тамос — пурра; ду рӯйхати пайвандҳо — паҳлӯи ҳам */}
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 pt-10 pb-8 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="col-span-2 md:col-span-1">
          <Link href={localizePath(lang, "/")} aria-label={dict.header.homeAria} className="inline-block">
            <Logo ink="text-foreground" />
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{t.tagline}</p>
          <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <ClockIcon width={16} height={16} className="text-accent" />
            {format(t.everyday, { hours })}
          </p>
          <InstallAppButton />
        </div>

        <nav aria-label={t.shop}>
          <h2 className={head}>{t.shop}</h2>
          <ul className="space-y-2.5">
            <li><Link href={localizePath(lang, "/catalog")} className={link}>{dict.nav.catalog}</Link></li>
            <li><Link href={localizePath(lang, "/about")} className={link}>{t.about.title}</Link></li>
          </ul>
        </nav>

        <nav aria-label={t.help}>
          <h2 className={head}>{t.help}</h2>
          <ul className="space-y-2.5">
            <li><Link href={localizePath(lang, "/delivery")} className={link}>{t.delivery.title}</Link></li>
            <li><Link href={localizePath(lang, "/contacts")} className={link}>{t.contacts.title}</Link></li>
            <li><Link href={localizePath(lang, "/profile")} className={link}>{dict.nav.profile}</Link></li>
          </ul>
        </nav>

        <div className="col-span-2 md:col-span-1">
          <h2 className={head}>{t.contact}</h2>
          <a href={STORE_CONTACT.phoneHref} className="block text-lg font-extrabold tracking-tight text-foreground tabular-nums hover:text-accent">
            {STORE_CONTACT.phone}
          </a>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={STORE_CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-btn bg-[#25D366]/12 px-3 py-1.5 text-sm font-semibold text-[#128C4A] hover:bg-[#25D366]/20 dark:text-[#5be38f]"
            >
              WhatsApp
            </a>
            <a
              href={STORE_CONTACT.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-btn bg-[#229ED9]/12 px-3 py-1.5 text-sm font-semibold text-[#1a7fb0] hover:bg-[#229ED9]/20 dark:text-[#6cc6f0]"
            >
              Telegram
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted sm:px-6">
          © {new Date().getFullYear()} RUDAKI MARKET · {t.rights}
        </p>
      </div>
    </footer>
  );
}
