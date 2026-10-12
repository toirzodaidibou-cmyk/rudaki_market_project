import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
};

/** Тугмаи хурди сарлавҳа (ранг ва шакл аз дизайн: --header-chip, --r-btn). */
export function IconButton({
  label,
  children,
  className = "",
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-btn bg-header-chip text-header-chip-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all hover:brightness-95 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
