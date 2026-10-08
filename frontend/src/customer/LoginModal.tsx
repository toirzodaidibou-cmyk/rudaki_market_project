"use client";

import { useEffect } from "react";
import { LoginForm } from "@/customer/LoginForm";
import { ProfileSolidIcon, XIcon } from "@/components/ui/icons";
import { useI18n } from "@/i18n/I18nProvider";

/** Равзанаи даромад: дар телефон аз поён (bottom sheet), дар компютер дар мобайн. */
export function LoginModal({ onClose }: { onClose: () => void }) {
  const { dict } = useI18n();
  const t = dict.auth;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm motion-safe:animate-menu-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        className="relative w-full max-w-md rounded-t-[28px] bg-background px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl motion-safe:animate-menu-in sm:rounded-[28px] sm:pb-6"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-muted hover:text-foreground"
        >
          <XIcon width={18} height={18} />
        </button>
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 text-[#b07800] dark:text-accent">
          <ProfileSolidIcon width={30} height={30} />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{t.title}</h2>
        <p className="mt-1 mb-5 text-sm text-muted">{t.subtitle}</p>
        <LoginForm />
      </div>
    </div>
  );
}
