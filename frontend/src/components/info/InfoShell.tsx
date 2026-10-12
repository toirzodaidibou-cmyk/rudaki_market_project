import type { ReactNode } from "react";

/** Саҳифаҳои маълумотӣ («Дар бораи мо», «Расонидан ва пардохт», «Тамос»): сарлавҳа ва мундариҷа. */
export function InfoShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 sm:px-6 sm:pt-10">
      <h1 className="mb-5 text-3xl font-extrabold tracking-tight text-foreground sm:mb-7 sm:text-4xl">{title}</h1>
      <div className="space-y-3.5">{children}</div>
    </main>
  );
}

/** Корти бахш: икона, сарлавҳа ва матн. */
export function InfoCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="flex gap-4 rounded-card bg-card p-4 shadow-[var(--card-shadow)] ring-1 ring-card-ring sm:p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-xl text-brand-soft-ink d3:rounded-full">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-[17px] font-bold text-foreground">{title}</h2>
        <div className="mt-1 text-[15px] leading-relaxed text-muted">{children}</div>
      </div>
    </section>
  );
}
