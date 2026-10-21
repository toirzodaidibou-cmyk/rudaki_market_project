"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { CircleCheckBig, MessageCircle, RotateCcw, SendHorizontal, ShoppingBag } from "lucide-react";
import { MinusIcon, PlusIcon, XIcon } from "@/components/ui/icons";
import { PayToBlock } from "@/customer/PayToBlock";
import { useCustomer } from "@/customer/CustomerProvider";
import { format, localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { ClientApiError, clientApi, clientFileUrl, formatPhone, newRequestId } from "@/lib/clientApi";
import type { AssistantCart, AssistantCheckout, AssistantProduct, CartLine, OrderPlaced } from "@/lib/clientApi";
import { CART_BUMP } from "@/lib/flyToCart";

type Message = {
  role: "user" | "assistant";
  text: string;
  /** Сабад баъд аз ин ҷавоб — маблағҳо аз сервер */
  cart?: AssistantCart;
  /** Кортҳои мол — нарх аз база */
  products?: AssistantProduct[];
  checkout?: AssistantCheckout;
  /** Калиди фармоиш: такрори «Тасдиқ» фармоиши дуюм намесозад */
  requestId?: string;
  placed?: OrderPlaced;
};

const STORAGE_KEY = "rm-assistant";
const MAX_HISTORY = 20;

const signature = (lines: CartLine[]) =>
  lines
    .filter((l) => l.quantity > 0)
    .map((l) => `${l.productId}:${l.quantity}`)
    .sort()
    .join(",");

function loadMessages(): Message[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? (parsed as Message[]).filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.text === "string") : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: Message[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
  } catch {
    // реҷаи хусусӣ — суҳбат танҳо дар хотира
  }
}

/** Андоза танҳо агар дар ном набошад («Себи сурх» + «1 кг»; «Coca-Cola, 1 л» — бе такрор). */
const sizeSuffix = (name: string, size: string | null) => (size && !/\d/.test(name) ? size : null);

/**
 * Ёрдамчии AI: тугмаи шинокунанда ва равзанаи суҳбат. Ёрдамчӣ молҳоро меёбад ва ба сабад мегузорад
 * (ҳамон сабади сайт — меҳмон ё аккаунт), баъд фармоишро омода мекунад; фармоишро танҳо худи мизоҷ
 * бо тугмаи «Тасдиқ» мефиристад (рақам — аз бақайдгирӣ, агар ворид нашуда бошад — аввал даромад).
 * Ҳамаи нархҳо ва маблағҳо дар кортҳо аз сервер меоянд, на аз матни AI.
 */
export function AssistantChat() {
  const { locale, dict } = useI18n();
  const t = dict.assistant;
  const { user, cart, cartQuantity, setCartQuantity, waitCart, refreshCart, requireLogin } = useCustomer();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState<number | null>(null);
  // Баъд аз даромад (аз тугмаи «Тасдиқ») — фармоиши ҳамин паём фиристода мешавад
  const [resume, setResume] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let alive = true;
    clientApi.assistantStatus().then(
      (s) => alive && setEnabled(s.enabled),
      () => {},
    );
    queueMicrotask(() => alive && setMessages(loadMessages()));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) saveMessages(messages);
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const nf = new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (v: number) => `${nf.format(v)} ${dict.product.currency}`;

  /** Сабади ҳозира (бо тағйироти ҳанӯз нафиристода). */
  const currentLines = (): CartLine[] =>
    (cart?.items ?? []).map((i) => ({ productId: i.productId, quantity: cartQuantity(i.productId) })).filter((l) => l.quantity > 0);

  function applyCart(next: AssistantCart) {
    const wanted = new Map(next.items.map((l) => [l.productId, l.quantity]));
    let changed = false;
    for (const l of currentLines()) {
      if (!wanted.has(l.productId)) {
        setCartQuantity(l.productId, 0);
        changed = true;
      }
    }
    for (const [id, q] of wanted) {
      if (cartQuantity(id) !== q) {
        setCartQuantity(id, q);
        changed = true;
      }
    }
    if (changed) window.dispatchEvent(new Event(CART_BUMP));
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    setInput("");
    const history = [...messages, { role: "user" as const, text: content }];
    setMessages(history);
    setBusy(true);
    try {
      const reply = await clientApi.assistantChat(
        history.slice(-MAX_HISTORY).map((m) => ({ role: m.role, text: m.text })),
        currentLines(),
        locale,
      );
      if (reply.cart) applyCart(reply.cart);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: reply.text,
          cart: reply.cart ?? undefined,
          products: reply.products.length > 0 ? reply.products : undefined,
          checkout: reply.checkout ?? undefined,
          requestId: reply.checkout ? newRequestId() : undefined,
        },
      ]);
    } catch (e) {
      const code = e instanceof ClientApiError ? e.code : "";
      setError(e instanceof ClientApiError && e.status === 429 ? t.rate : code === "assistant_busy" ? t.busy : t.error);
      // Паёми мизоҷ мемонад — метавонад боз фиристад
      setInput(content);
      setMessages((m) => m.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  async function placeOrder(index: number) {
    const message = messages[index];
    const checkout = message?.checkout;
    if (!checkout || !message.requestId) return;
    setError(null);
    setPlacing(index);
    try {
      // Фармоиш аз сабади аккаунт сохта мешавад — бояд айнан ҳамон бошад, ки ёрдамчӣ омода кард
      await waitCart();
      const server = await clientApi.cart();
      const serverLines = server.items.filter((i) => i.available).map((i) => ({ productId: i.productId, quantity: i.quantity }));
      if (signature(serverLines) !== signature(checkout.lines)) {
        setError(t.cartChanged);
        void refreshCart();
        return;
      }
      const placed = await clientApi.placeOrder(
        checkout.address,
        checkout.comment ?? "",
        checkout.deliveryStart,
        checkout.paymentMethod,
        message.requestId,
        checkout.useBonus,
      );
      setMessages((m) => m.map((x, i) => (i === index ? { ...x, placed } : x)));
      void refreshCart();
    } catch (e) {
      const code = e instanceof ClientApiError ? e.code : "unknown";
      const errors = dict.checkout.errors;
      setError(errors[code as keyof typeof errors] ?? errors.unknown);
    } finally {
      setPlacing(null);
    }
  }

  // Меҳмон «Тасдиқ»-ро пахш кард → даромад → сабади браузер ба аккаунт ҳамроҳ шуд → фармоиш
  useEffect(() => {
    if (resume === null || !user || !cart) return;
    const index = resume;
    queueMicrotask(() => {
      setResume(null);
      void placeOrder(index);
    });
    // placeOrder ҳар рендер нав аст; танҳо пас аз даромад ва омадани сабад
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, user, cart]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  }

  function newChat() {
    setMessages([]);
    setError(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ҳеҷ
    }
  }

  if (!enabled) return null;

  const payLabel: Record<string, string> = {
    cash: dict.checkout.payCash,
    alif: dict.checkout.payAlif,
    dc: dict.checkout.payDc,
    korti_milli: dict.checkout.payKortiMilli,
  };
  let lastCheckout = -1;
  let lastCart = -1;
  messages.forEach((m, i) => {
    if (m.checkout && !m.placed) lastCheckout = i;
    if (m.cart) lastCart = i;
  });

  function renderProducts(products: AssistantProduct[]) {
    return (
      <div className="mt-2 grid grid-cols-2 gap-2">
        {products.map((p) => {
          const q = cartQuantity(p.id);
          const size = sizeSuffix(p.name[locale], p.sizeLabel);
          return (
            <div key={p.id} className="flex flex-col rounded-2xl border border-border bg-background p-2">
              <Link
                href={localizePath(locale, `/product/${p.id}`)}
                onClick={() => setOpen(false)}
                className="relative mb-1.5 block aspect-square overflow-hidden rounded-xl bg-white"
              >
                {p.image && <Image src={clientFileUrl(p.image)} alt="" fill unoptimized sizes="160px" className="object-contain p-1.5" />}
              </Link>
              <p className="line-clamp-2 text-xs font-medium text-foreground">
                {p.name[locale]}
                {size && <span className="text-muted"> · {size}</span>}
              </p>
              <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
                {money(p.price)}
                {p.oldPrice && <span className="ml-1 text-xs font-normal text-muted line-through">{money(p.oldPrice)}</span>}
              </p>
              {q === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setCartQuantity(p.id, 1);
                    window.dispatchEvent(new Event(CART_BUMP));
                  }}
                  className="mt-1.5 h-8 rounded-lg bg-accent text-xs font-bold text-white hover:brightness-95 active:scale-95"
                >
                  {dict.product.addToCart}
                </button>
              ) : (
                <div className="mt-1.5 flex h-8 items-center justify-between rounded-lg bg-accent/10 text-accent">
                  <button type="button" onClick={() => setCartQuantity(p.id, q - 1)} aria-label={dict.cart.decrease} className="flex h-8 w-8 items-center justify-center">
                    <MinusIcon width={14} height={14} />
                  </button>
                  <span className="text-sm font-bold tabular-nums">{q}</span>
                  <button type="button" onClick={() => setCartQuantity(p.id, q + 1)} aria-label={dict.cart.increase} className="flex h-8 w-8 items-center justify-center">
                    <PlusIcon width={14} height={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderLines(c: AssistantCart) {
    return (
      <>
        <ul className="space-y-1">
          {c.items.map((i) => {
            const size = sizeSuffix(i.name[locale], i.sizeLabel);
            return (
              <li key={i.productId} className="flex justify-between gap-3">
                <span className="min-w-0 text-foreground">
                  {i.name[locale]}
                  {size && <span className="text-muted"> · {size}</span>}
                  <span className="text-muted"> × {i.quantity}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted">{money(i.price * i.quantity)}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 space-y-1 border-t border-border pt-2 text-muted">
          {c.discount > 0 && (
            <p className="flex justify-between font-medium text-[#1f9d55]">
              <span>{dict.cart.bundleDiscount}</span>
              <span className="tabular-nums">−{money(c.discount)}</span>
            </p>
          )}
          <p className="flex justify-between">
            <span>{dict.checkout.delivery}</span>
            <span className="tabular-nums">{c.deliveryFee === 0 ? dict.checkout.free : money(c.deliveryFee)}</span>
          </p>
        </div>
      </>
    );
  }

  function renderCart(c: AssistantCart) {
    if (c.items.length === 0) return null;
    return (
      <div className="mt-2 rounded-2xl border border-border bg-background p-3 text-sm">
        <p className="mb-2 flex items-center gap-1.5 font-bold text-foreground">
          <ShoppingBag size={15} className="text-accent" aria-hidden /> {t.cartTitle}
        </p>
        {renderLines(c)}
        <p className="mt-1 flex justify-between font-bold text-foreground">
          <span>{t.total}</span>
          <span className="tabular-nums">{money(c.total)}</span>
        </p>
        <Link
          href={localizePath(locale, "/cart")}
          onClick={() => setOpen(false)}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
        >
          {t.openCart} →
        </Link>
      </div>
    );
  }

  function renderCheckout(message: Message, index: number) {
    const checkout = message.checkout!;
    if (message.placed) {
      const p = message.placed;
      return (
        <div className="mt-2 rounded-2xl border border-accent/30 bg-accent/10 p-3 text-sm">
          <p className="flex items-center gap-2 font-bold text-foreground">
            <CircleCheckBig size={18} className="text-accent" aria-hidden /> {format(t.placed, { n: String(p.number) })}
          </p>
          <p className="mt-1 text-muted">{format(t.placedHint, { phone: user ? formatPhone(user.phone) : "" })}</p>
          <p className="mt-1 font-semibold tabular-nums text-foreground">
            {t.total}: {money(p.total)}
          </p>
          {p.payTo && <PayToBlock payTo={p.payTo} label={payLabel[p.payTo.method] ?? p.payTo.method} />}
        </div>
      );
    }
    const c = message.cart;
    const active = index === lastCheckout;
    return (
      <div className={`mt-2 rounded-2xl border border-border bg-background p-3 text-sm ${active ? "" : "opacity-60"}`}>
        <p className="mb-2 font-bold text-foreground">{t.checkoutTitle}</p>
        {c && renderLines(c)}
        <dl className="mt-2 space-y-1 border-t border-border pt-2 text-muted">
          <div className="flex gap-2">
            <dt className="shrink-0">{t.address}:</dt>
            <dd className="text-foreground">{checkout.address}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0">{t.time}:</dt>
            <dd className="text-foreground">{checkout.deliveryLabel.replace("⚡ ", "")}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0">{t.payment}:</dt>
            <dd className="text-foreground">
              {payLabel[checkout.paymentMethod] ?? checkout.paymentMethod}
              {checkout.useBonus && ` + ${t.bonus}`}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0">{t.phone}:</dt>
            <dd className="text-foreground">{user ? formatPhone(user.phone) : t.phoneAfterLogin}</dd>
          </div>
          {checkout.comment && <p className="text-foreground">💬 {checkout.comment}</p>}
        </dl>
        {c && (
          <p className="mt-2 flex justify-between border-t border-border pt-2 font-bold text-foreground">
            <span>{t.total}</span>
            <span className="tabular-nums">{money(c.total)}</span>
          </p>
        )}
        {checkout.useBonus && <p className="mt-1 text-xs text-muted">{dict.checkout.useBonus}</p>}
        {active && (
          <button
            type="button"
            disabled={placing !== null}
            onClick={() => (user ? void placeOrder(index) : requireLogin(() => setResume(index)))}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-white transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-60"
          >
            {placing === index ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" /> : <CircleCheckBig size={17} aria-hidden />}
            {t.confirm}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.open}
          className="fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 flex h-14 items-center gap-2 rounded-full bg-accent pr-5 pl-4 text-sm font-bold text-white shadow-[0_14px_30px_-10px_rgba(21,154,87,0.75)] transition-transform hover:brightness-95 active:scale-95 md:right-6 md:bottom-6"
        >
          <MessageCircle size={22} aria-hidden />
          <span className="hidden sm:inline">{t.open}</span>
          <span className="sm:hidden">AI</span>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label={t.title}
          className="fixed inset-x-0 top-[8vh] bottom-0 z-50 flex flex-col overflow-hidden rounded-t-[26px] bg-surface shadow-[0_-10px_40px_-12px_rgba(0,0,0,0.35)] ring-1 ring-black/5 sm:inset-x-auto sm:top-auto sm:right-6 sm:bottom-6 sm:h-[min(640px,calc(100vh-3rem))] sm:w-[400px] sm:rounded-[26px] dark:ring-white/10"
        >
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <MessageCircle size={21} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-foreground">{t.title}</p>
              <p className="truncate text-xs text-muted">{t.subtitle}</p>
            </div>
            {messages.length > 0 && (
              <button type="button" onClick={newChat} aria-label={t.newChat} title={t.newChat} className="rounded-full p-2 text-muted hover:bg-background hover:text-foreground">
                <RotateCcw size={18} />
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} aria-label={t.close} className="rounded-full p-2 text-muted hover:bg-background hover:text-foreground">
              <XIcon width={20} height={20} />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
            <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-background px-3.5 py-2.5 text-sm text-foreground">{t.greeting}</div>
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {t.examples.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => void send(ex)}
                    className="rounded-full border border-accent/40 px-3 py-1.5 text-left text-xs font-semibold text-accent hover:bg-accent/10"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-accent px-3.5 py-2.5 text-sm whitespace-pre-wrap text-white">
                  {m.text}
                </div>
              ) : (
                <div key={i} className="max-w-[94%]">
                  <div className="rounded-2xl rounded-tl-md bg-background px-3.5 py-2.5 text-sm whitespace-pre-wrap text-foreground">{m.text}</div>
                  {m.products && renderProducts(m.products)}
                  {/* Корти сабад — танҳо дар ҷавоби охирини сабад (пештара кӯҳна шудааст) */}
                  {m.cart && !m.checkout && i === lastCart && renderCart(m.cart)}
                  {m.checkout && renderCheckout(m, i)}
                </div>
              ),
            )}
            {busy && (
              <div className="inline-flex items-center gap-2 rounded-2xl rounded-tl-md bg-background px-3.5 py-2.5 text-sm text-muted">
                <span className="flex gap-1" aria-hidden>
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
                </span>
                {t.thinking}
              </div>
            )}
            {error && <p className="rounded-xl bg-sale/10 px-3 py-2 text-sm text-sale">{error}</p>}
          </div>

          <form onSubmit={onSubmit} className="border-t border-border px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 1000))}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder={t.placeholder}
                aria-label={t.placeholder}
                className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-background px-3.5 py-2.5 text-[16px] text-foreground outline-none [field-sizing:content] focus:border-accent sm:text-sm"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label={t.send}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-all hover:brightness-95 active:scale-95 disabled:opacity-40"
              >
                <SendHorizontal size={19} />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[11px] text-muted">{t.disclaimer}</p>
          </form>
        </section>
      )}
    </>
  );
}
