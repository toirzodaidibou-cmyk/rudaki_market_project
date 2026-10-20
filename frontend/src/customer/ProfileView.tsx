"use client";

import { useEffect, useState } from "react";
import { CircleCheckBig, CircleDot, CircleX, Clock, CreditCard, MapPin, MessageCircle, Package, RotateCcw, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, ProfileSolidIcon } from "@/components/ui/icons";
import { useCustomer } from "@/customer/CustomerProvider";
import { PaymentLogo } from "@/customer/PaymentLogo";
import { LoginForm } from "@/customer/LoginForm";
import { LoyaltyCard } from "@/customer/LoyaltyCard";
import { format, localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { clientApi, clientFileUrl, formatPhone } from "@/lib/clientApi";
import type { CustomerOrder } from "@/lib/clientApi";

/** Вақти фармоиш ҳамеша бо вақти Тоҷикистон (Душанбе), новобаста аз танзимоти дастгоҳ. */
const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Dushanbe",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Dushanbe", hour: "2-digit", minute: "2-digit" });

/** Саҳифаи "Профил": ворид нашуда — формаи даромад; ворид шуда — рақам ва таърихи харид. */
/** Ранг ва аломати ҳолати фармоиш (ҳамон ҳолатҳо дар админ). */
const STATUS_STYLE: Record<string, { icon: LucideIcon; color: string }> = {
  new: { icon: CircleDot, color: "text-[#d97706]" },
  confirmed: { icon: Package, color: "text-[#0284c7]" },
  delivering: { icon: Truck, color: "text-[#7c3aed]" },
  delivered: { icon: CircleCheckBig, color: "text-[#1f9d55]" },
  cancelled: { icon: CircleX, color: "text-muted" },
};

/** Сатри маълумоти фармоиш бо иконаи хурд. */
function DetailRow({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="flex items-start gap-1.5 pt-0.5 first:pt-0">
      <Icon size={14} strokeWidth={2.2} aria-hidden className="mt-px shrink-0" />
      <span className="min-w-0">{children}</span>
    </span>
  );
}

export function ProfileView() {
  const { locale, dict } = useI18n();
  const t = dict.profile;
  const { user, logout, refreshCart } = useCustomer();
  const router = useRouter();
  const [reordering, setReordering] = useState<number | null>(null);
  const [reorderNote, setReorderNote] = useState<{ number: number; text: string } | null>(null);

  /** "Боз харидан" → молҳо ба сабад → саҳифаи сабад (агар баъзеашон дигар набошанд — огоҳӣ). */
  async function reorder(number: number) {
    setReordering(number);
    try {
      const r = await clientApi.reorder(number);
      await refreshCart();
      if (r.unavailable.length > 0) {
        setReorderNote({ number, text: format(t.reorderUnavailable, { names: r.unavailable.join(", ") }) });
        if (r.cart.items.length > 0) setTimeout(() => router.push(localizePath(locale, "/cart")), 2500);
      } else {
        router.push(localizePath(locale, "/cart"));
      }
    } catch {
      setReorderNote({ number, text: t.reorderError });
    } finally {
      setReordering(null);
    }
  }
  const [orders, setOrders] = useState<CustomerOrder[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  // Фармоишҳои кушодашуда (бо клик)
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const toggle = (n: number) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const nf = new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (v: number) => `${nf.format(v)} ${dict.product.currency}`;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    clientApi.orders(1).then(
      (r) => {
        if (cancelled) return;
        setOrders(r.items);
        setTotal(r.total);
        setPage(1);
      },
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const r = await clientApi.orders(page + 1);
      setOrders((list) => [...(list ?? []), ...r.items]);
      setPage(r.page);
      setTotal(r.total);
    } finally {
      setLoadingMore(false);
    }
  }

  if (user === undefined) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-r-transparent" />
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="mx-auto max-w-md rounded-[28px] bg-surface p-6 sm:mt-6 sm:p-8">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-soft-ink">
          <ProfileSolidIcon width={30} height={30} />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">{dict.auth.title}</h2>
        <p className="mt-1 mb-5 text-sm text-muted">{dict.auth.subtitle}</p>
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Мизоҷ */}
      <div className="flex items-center gap-3 rounded-[24px] bg-surface p-4 sm:gap-4 sm:p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent sm:h-14 sm:w-14">
          <ProfileSolidIcon width={28} height={28} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold whitespace-nowrap text-foreground tabular-nums sm:text-lg">{formatPhone(user.phone)}</p>
          {/* Шумораи фармоишҳо · Баромадан — дар як сатр зери рақам (рақам ҳеҷ гоҳ бурида намешавад) */}
          <p className="mt-0.5 flex items-center gap-2 text-sm text-muted">
            {orders && <span>{format(t.ordersCount, { n: String(total) })}</span>}
            {orders && <span aria-hidden>·</span>}
            <button type="button" onClick={() => void logout()} className="font-medium text-foreground hover:underline">
              {dict.auth.logout}
            </button>
          </p>
        </div>
      </div>

      {/* Корти бонусии Рӯдакӣ */}
      <div className="mt-5">
        <LoyaltyCard />
      </div>

      <h2 className="mt-8 mb-3 px-1 text-xl font-extrabold tracking-tight text-foreground">{t.myOrders}</h2>

      {failed ? (
        <p className="py-10 text-center text-muted">{dict.auth.errors.unknown}</p>
      ) : orders === null ? (
        <div className="flex justify-center py-10">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-r-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[24px] bg-surface/60 py-12 text-center">
          <p className="text-muted">{t.noOrders}</p>
          <Link
            href={localizePath(locale, "/catalog")}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent hover:brightness-95"
          >
            {dict.cart.toCatalog}
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-2.5">
            {orders.map((o) => {
              const created = new Date(o.createdAt);
              const isOpen = open.has(o.number);
              return (
                <li key={o.number} className="overflow-hidden rounded-[20px] bg-surface">
                  {/* Хурд: №, сана/вақт, суратҳо, ҳамагӣ — бо клик кушода мешавад */}
                  <button
                    type="button"
                    onClick={() => toggle(o.number)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-surface-hover/60 sm:p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-foreground">{format(t.orderNo, { n: String(o.number) })}</p>
                      <p className="mt-0.5 text-xs text-muted tabular-nums">
                        {dateFormat.format(created)} · {timeFormat.format(created)}
                      </p>
                      <p className="mt-0.5 text-xs">
                        <span className={`inline-flex items-center gap-1 align-middle font-semibold ${STATUS_STYLE[o.status]?.color ?? "text-muted"}`}>
                          {(() => {
                            const StatusIcon = STATUS_STYLE[o.status]?.icon ?? CircleDot;
                            return <StatusIcon size={13} strokeWidth={2.5} aria-hidden />;
                          })()}
                          {t.status[o.status as keyof typeof t.status] ?? o.status}
                        </span>
                        {/* Дар экрани танг ба ҷои суратҳо — шумораи молҳо */}
                        <span className="text-muted sm:hidden"> · {format(t.itemsCount, { n: String(o.items.reduce((n, i) => n + i.quantity, 0)) })}</span>
                      </p>
                    </div>

                    {!isOpen && (
                      <div className="hidden shrink-0 -space-x-2 sm:flex">
                        {o.items.slice(0, 3).map((i, idx) => (
                          <div
                            key={idx}
                            className="relative h-9 w-9 overflow-hidden rounded-full bg-white ring-2 ring-surface"
                          >
                            {i.image && (
                              <Image src={clientFileUrl(i.image)} alt="" fill unoptimized sizes="36px" className="object-contain p-0.5" />
                            )}
                          </div>
                        ))}
                        {o.items.length > 3 && (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-[11px] font-semibold text-muted ring-2 ring-surface">
                            +{o.items.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    <span className="shrink-0 text-[15px] font-extrabold text-foreground tabular-nums">{money(o.total)}</span>
                    <ChevronDownIcon
                      width={18}
                      height={18}
                      className={`shrink-0 text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Пурра: молҳо, маблағ, суроға */}
                  {isOpen && (
                    <div className="border-t border-border px-3 pt-1 pb-4 motion-safe:animate-menu-in sm:px-4">
                      {/* Молҳо */}
                      <ul className="mt-4 space-y-2.5">
                        {o.items.map((i, idx) => (
                          <li key={idx} className="flex items-center gap-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-black/[0.06] ring-inset dark:ring-white/10">
                              {i.image && (
                                <Image
                                  src={clientFileUrl(i.image)}
                                  alt=""
                                  fill
                                  unoptimized
                                  sizes="48px"
                                  className="object-contain p-1"
                                />
                              )}
                            </div>
                            <p className="min-w-0 flex-1 text-sm leading-5 text-foreground">
                              <span className="line-clamp-2">
                                {i.name}
                                {i.sizeLabel && <span className="text-muted"> · {i.sizeLabel}</span>}
                              </span>
                              <span className="text-xs text-muted tabular-nums">
                                {i.quantity} × {money(i.price)}
                              </span>
                            </p>
                            <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">{money(i.lineTotal)}</span>
                          </li>
                        ))}
                      </ul>
    
                      {/* Маблағ */}
                      <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
                        <div className="flex justify-between text-muted">
                          <span>{t.goods}</span>
                          <span className="tabular-nums">{money(o.subtotal)}</span>
                        </div>
                        {o.discount > 0 && (
                          <div className="flex justify-between font-medium text-[#1f9d55]">
                            <span>{dict.cart.bundleDiscount}</span>
                            <span className="tabular-nums">−{money(o.discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-muted">
                          <span>{dict.checkout.delivery}</span>
                          <span className={o.deliveryFee === 0 ? "font-semibold text-[#1f9d55]" : "tabular-nums"}>
                            {o.deliveryFee === 0 ? dict.checkout.free : money(o.deliveryFee)}
                          </span>
                        </div>
                        {o.bonusUsed > 0 && (
                          <div className="flex justify-between font-medium text-[#1f9d55]">
                            <span>{dict.checkout.bonusPaid}</span>
                            <span className="tabular-nums">−{money(o.bonusUsed)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 text-base font-bold text-foreground">
                          <span>{dict.cart.total}</span>
                          <span className="tabular-nums">{money(o.total)}</span>
                        </div>
                        {o.bonus > 0 && (
                          <div className="flex justify-between text-xs font-semibold text-[#1f9d55]">
                            <span>{t.bonus}</span>
                            <span className="tabular-nums">+{money(o.bonus)}</span>
                          </div>
                        )}
                      </div>
    
                      <div className="mt-3 rounded-xl bg-background px-3 py-2 text-xs text-muted">
                        <DetailRow icon={MapPin}>
                          {t.address}: <span className="text-foreground">{o.address}</span>
                        </DetailRow>
                        <DetailRow icon={Clock}>
                          {dict.checkout.deliveryTime}:{" "}
                          <span className="text-foreground">
                            {o.deliveryFrom && o.deliveryTo
                              ? `${dateFormat.format(new Date(o.deliveryFrom))} ${timeFormat.format(new Date(o.deliveryFrom))}–${timeFormat.format(new Date(o.deliveryTo))}`
                              : dict.checkout.asap}
                          </span>
                        </DetailRow>
                        <DetailRow icon={CreditCard}>
                          {dict.checkout.payment}:{" "}
                          <span className="inline-flex items-center gap-1.5 align-middle text-foreground">
                            <PaymentLogo method={o.paymentMethod} size={20} />
                            {{ cash: dict.checkout.payCash, alif: dict.checkout.payAlif, dc: dict.checkout.payDc, korti_milli: dict.checkout.payKortiMilli }[o.paymentMethod] ?? o.paymentMethod}
                          </span>
                        </DetailRow>
                        {o.comment && <DetailRow icon={MessageCircle}>{o.comment}</DetailRow>}
                      </div>

                      <button
                        type="button"
                        onClick={() => reorder(o.number)}
                        disabled={reordering !== null}
                        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent font-semibold text-on-accent transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-60"
                      >
                        {reordering === o.number ? (
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                        ) : (
                          <RotateCcw size={18} strokeWidth={2.4} aria-hidden />
                        )}
                        {t.reorder}
                      </button>
                      {reorderNote?.number === o.number && (
                        <p role="status" className="mt-2 rounded-xl bg-[#ff9f0a]/15 px-3 py-2 text-xs text-foreground">
                          {reorderNote.text}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {orders.length < total && (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="rounded-full bg-surface px-6 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-hover disabled:opacity-60"
              >
                {t.loadMore}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
