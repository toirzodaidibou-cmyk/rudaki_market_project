"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { CartButton } from "@/components/product/ProductCard";
import { CartSolidIcon, XIcon } from "@/components/ui/icons";
import { useCustomer } from "@/customer/CustomerProvider";
import { CheckoutOptions } from "@/customer/CheckoutOptions";
import type { DeliveryChoice } from "@/customer/CheckoutOptions";
import { format, localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { ClientApiError, clientApi, clientFileUrl, formatPhone, newRequestId } from "@/lib/clientApi";
import type { CartItem, OrderPlaced } from "@/lib/clientApi";
import { loadDeliveryAddress } from "@/lib/geo";

function WhatsAppLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.5 14.1c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .3-3.2-.7-2.7-1.1-4.4-3.9-4.5-4.1-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.7-.1l1-1.2c.2-.3.5-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.8-.1 1.5Z" />
    </svg>
  );
}

/** Молҳои дастрас ва миқдорашон — барои муқоисаи сабад пеш ва пас аз даромад. */
const cartSignature = (items: Pick<CartItem, "productId" | "quantity" | "available">[]) =>
  items
    .filter((i) => i.available && i.quantity > 0)
    .map((i) => `${i.productId}:${i.quantity}`)
    .sort()
    .join(",");

/**
 * Саҳифаи "Сабад" — барои ҳама (меҳмон ҳам). Даромад танҳо ҳангоми «Тасдиқи фармоиш»:
 * баъд аз даромад фармоиш худкор фиристода мешавад, агар сабад иваз нашуда бошад
 * (агар дар аккаунт аз пеш молҳо буданд — мизоҷ аввал сабади нав-ро мебинад).
 */
export function CartView() {
  const { locale, dict } = useI18n();
  const t = dict.cart;
  const tc = dict.checkout;
  const { user, cart, cartQuantity, cartCount, setCartQuantity, clearCart, refreshCart, requireLogin } = useCustomer();
  // Агар дар харитаи саҳифаи асосӣ «Ба ин суроға фармоиш» пахш шуда бошад — суроға аллакай пур аст
  const [address, setAddress] = useState(loadDeliveryAddress);
  const [comment, setComment] = useState("");
  const [delivery, setDelivery] = useState<DeliveryChoice>(undefined);
  const [payment, setPayment] = useState("cash");
  const [optionsKey, setOptionsKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<OrderPlaced | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Сабади меҳмон ҳангоми пахши «Тасдиқ» — баъд аз даромад бо сабади аккаунт муқоиса мешавад
  const [resumeAfterLogin, setResumeAfterLogin] = useState<string | null>(null);
  // Як калид барои ҳамин фармоиш: такрори дархост (интернети суст) фармоиши дуюм намесозад
  const requestId = useRef<string | null>(null);

  const nf = new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (v: number) => `${nf.format(v)} ${dict.product.currency}`;

  async function submitOrder() {
    setOrderError(null);
    setNotice(null);
    setSubmitting(true);
    requestId.current ??= newRequestId();
    try {
      // Фармоиш ба мағоза аз сервер худкор меравад (WhatsApp-и фурӯшанда); WhatsApp-и мизоҷ — ихтиёрӣ
      const order = await clientApi.placeOrder(address, comment, delivery ?? null, payment, requestId.current);
      setPlaced(order);
      void refreshCart();
    } catch (err) {
      const code = err instanceof ClientApiError ? err.code : "unknown";
      setOrderError(tc.errors[code as keyof typeof tc.errors] ?? tc.errors.unknown);
      // Вақт гузашт ё мағоза пӯшид — вақтҳоро аз нав мегирем
      if (code === "slot_unavailable" || code === "asap_unavailable") setOptionsKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  }

  // Баъд аз даромад (аз тугмаи «Тасдиқ»): агар сабад ҳамон бошад — фармоиш фавран; вагарна мизоҷ аввал месанҷад
  useEffect(() => {
    if (resumeAfterLogin === null || !user || !cart) return;
    const same = cartSignature(cart.items) === resumeAfterLogin;
    queueMicrotask(() => {
      setResumeAfterLogin(null);
      if (same) void submitOrder();
      else setNotice(tc.cartMerged);
    });
    // submitOrder ҳар рендер нав аст; танҳо пас аз даромад ва омадани сабад иҷро мешавад
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeAfterLogin, user, cart]);

  // Фармоиш қабул шуд — экрани муваффақият (сабад аллакай холӣ аст)
  if (placed) {
    return (
      <div className="mx-auto max-w-md rounded-[28px] bg-surface p-6 text-center sm:mt-6 sm:p-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366]/15 text-3xl">✅</div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          {format(tc.successTitle, { n: String(placed.number) })}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {format(placed.ownerNotified ? tc.successTextCall : tc.successText, { phone: user ? formatPhone(user.phone) : "" })}
        </p>
        <div className="mt-5 space-y-1.5 rounded-2xl bg-background p-4 text-sm">
          <div className="flex justify-between text-muted">
            <span>{t.summary}</span>
            <span className="tabular-nums">{money(placed.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>{tc.delivery}</span>
            <span>{placed.deliveryFee === 0 ? tc.free : money(placed.deliveryFee)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-bold text-foreground">
            <span>{t.total}</span>
            <span className="tabular-nums">{money(placed.total)}</span>
          </div>
        </div>
        <a
          href={placed.whatsAppUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={
            placed.ownerNotified
              ? "mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#25D366]/40 text-sm font-semibold text-[#1f9d55] transition-all hover:bg-[#25D366]/10 active:scale-[0.98]"
              : "mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] text-base font-semibold text-white transition-all hover:brightness-95 active:scale-[0.98]"
          }
        >
          <WhatsAppLogo className={placed.ownerNotified ? "h-5 w-5" : "h-6 w-6"} />
          {placed.ownerNotified ? tc.writeWhatsAppOptional : tc.sendWhatsApp}
        </a>
        <Link href={localizePath(locale, "/")} className="mt-3 inline-block text-sm font-medium text-muted hover:text-foreground">
          {tc.continueShopping}
        </Link>
      </div>
    );
  }

  if (user === undefined || cart === null) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-muted border-r-transparent" />
      </div>
    );
  }

  // Миқдорҳо бо назардошти тағйироти ҳанӯз нафиристода (оптимистӣ); 0 — аз рӯйхат мебарояд
  const items = (cart?.items ?? [])
    .map((i) => ({ ...i, quantity: cartQuantity(i.productId) }))
    .filter((i) => i.quantity > 0);
  const total = items.filter((i) => i.available).reduce((s, i) => s + i.price * i.quantity, 0);
  // Расонидан: аз FreeDeliveryFrom ва зиёд — ройгон (ҳисоби ниҳоӣ дар сервер)
  const freeFrom = cart?.freeDeliveryFrom ?? 200;
  const deliveryFee = total >= freeFrom ? 0 : (cart?.deliveryPrice ?? 0);
  const remaining = Math.max(0, freeFrom - total);

  async function placeOrder(e: FormEvent) {
    e.preventDefault();
    if (address.trim().length < 5) {
      setOrderError(tc.errors.address_required);
      return;
    }
    if (delivery === undefined) {
      setOrderError(tc.errors.slot_unavailable);
      return;
    }
    if (!user) {
      // Меҳмон: аввал даромад (рақам), баъд фармоиш — формаи пуркардашуда мемонад
      const signature = cartSignature(items);
      setOrderError(null);
      requireLogin(() => setResumeAfterLogin(signature));
      return;
    }
    await submitOrder();
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <CartSolidIcon width={56} height={56} className="text-muted/40" />
        <p className="text-muted">{t.empty}</p>
        <Link
          href={localizePath(locale, "/catalog")}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-on-accent hover:brightness-95"
        >
          {t.toCatalog}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div>
        <ul className="divide-y divide-border rounded-[24px] bg-surface/60 px-3 sm:px-4">
          {items.map((item) => (
            <li key={item.productId} className={`flex gap-3 py-4 sm:gap-4 ${item.available ? "" : "opacity-50"}`}>
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white sm:h-28 sm:w-28 ring-1 ring-black/[0.06] ring-inset dark:ring-white/10">
                {item.image && (
                  <Image
                    src={clientFileUrl(item.image)}
                    alt=""
                    fill
                    unoptimized
                    sizes="112px"
                    className="object-contain p-2"
                  />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start gap-2">
                  <p className="line-clamp-2 flex-1 text-[15px] leading-5 text-foreground">
                    {item.name[locale] || item.name.tg}
                    {item.sizeLabel && <span className="text-muted"> · {item.sizeLabel}</span>}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCartQuantity(item.productId, 0)}
                    aria-label={t.remove}
                    title={t.remove}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-foreground"
                  >
                    <XIcon width={16} height={16} />
                  </button>
                </div>

                {item.available ? (
                  <p className="mt-0.5 text-xs text-muted">{format(t.perItem, { price: money(item.price) })}</p>
                ) : (
                  <p className="mt-0.5 text-xs font-medium text-[#e5484d]">{t.unavailable}</p>
                )}

                <div className="mt-auto flex items-end justify-between gap-3 pt-2">
                  <div className="w-32">
                    {item.available && <CartButton productId={item.productId} label="" />}
                  </div>
                  <span className="text-lg font-extrabold tracking-tight text-foreground tabular-nums">
                    {money(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => void clearCart()}
          className="mt-3 px-2 text-sm font-medium text-muted hover:text-[#e5484d]"
        >
          {t.clear}
        </button>
      </div>

      {/* Ҷамъбаст + формаи фармоиш — дар компютер дар тараф ва "часпида" */}
      <aside className="rounded-[24px] bg-surface p-5 lg:sticky lg:top-28">
        <h2 className="text-lg font-bold text-foreground">{t.summary}</h2>
        <div className="mt-4 flex justify-between text-sm text-muted">
          <span>{format(t.items, { n: String(cartCount) })}</span>
          <span className="tabular-nums">{money(total)}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm text-muted">
          <span>{tc.delivery}</span>
          <span className={deliveryFee === 0 ? "font-semibold text-[#1f9d55]" : "tabular-nums"}>
            {deliveryFee === 0 ? tc.free : money(deliveryFee)}
          </span>
        </div>

        {/* То расонидани ройгон чӣ қадар монд */}
        <div className="mt-3 rounded-xl bg-background p-3">
          <p className="text-xs font-medium text-foreground">
            {remaining > 0 ? format(tc.freeHint, { amount: money(remaining) }) : tc.freeReached}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${Math.min(100, (total / freeFrom) * 100)}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <span className="font-semibold text-foreground">{t.total}</span>
          <span className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">{money(total + deliveryFee)}</span>
        </div>

        <form onSubmit={placeOrder} className="mt-5 space-y-3" noValidate>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">{tc.address}</span>
            <textarea
              required
              rows={2}
              maxLength={500}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setOrderError(null);
              }}
              placeholder={tc.addressPlaceholder}
              aria-invalid={!!orderError}
              className="w-full resize-none rounded-xl border-2 border-border bg-background px-3 py-2.5 text-[15px] text-foreground outline-none placeholder:text-muted focus:border-accent"
            />
          </label>
          <CheckoutOptions delivery={delivery} onDelivery={setDelivery} payment={payment} onPayment={setPayment} reloadKey={optionsKey} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">{tc.comment}</span>
            <input
              maxLength={500}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={tc.commentPlaceholder}
              className="h-11 w-full rounded-xl border-2 border-border bg-background px-3 text-[15px] text-foreground outline-none placeholder:text-muted focus:border-accent"
            />
          </label>
          {orderError && (
            <p role="alert" className="text-sm font-medium text-[#e5484d]">
              {orderError}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-xl bg-accent/15 px-3 py-2.5 text-sm font-medium text-foreground">
              {notice}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-base font-semibold text-on-accent transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
            ) : (
              tc.confirm
            )}
          </button>
        </form>
      </aside>
    </div>
  );
}
