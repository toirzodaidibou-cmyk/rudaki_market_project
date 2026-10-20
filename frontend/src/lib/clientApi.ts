// Дархостҳо аз браузер ба backend (бо cookie-и мизоҷ). Барои server — src/lib/api.ts.
import type { Product } from "@/lib/api";
import { toFileUrl } from "@/lib/files";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5080";

export type Customer = { phone: string };

export type CartItem = {
  productId: number;
  name: Record<"tg" | "ru" | "en" | "uz", string>;
  price: number;
  oldPrice: number | null;
  sizeLabel: string | null;
  image: string | null;
  quantity: number;
  /** false — мол пинҳон шудааст (дар маблағ ҳисоб намешавад) */
  available: boolean;
};
/** Тахфифи як маҷмӯа дар сабад: чанд маротиба пурра ҷамъ шуд ва чанд сомонӣ. */
export type BundleDiscount = {
  bundleId: number;
  name: Record<"tg" | "ru" | "en" | "uz", string>;
  percent: number;
  times: number;
  amount: number;
};
export type Cart = {
  items: CartItem[];
  totalQuantity: number;
  /** Нархи молҳо бе тахфиф */
  totalPrice: number;
  /** Тахфифи маҷмӯаҳо (ҷамъи discounts) */
  discount: number;
  discounts: BundleDiscount[];
  /** Расонидан барои ҳамин сабад (0 — ройгон), аз маблағи баъд аз тахфиф */
  deliveryFee: number;
  /** Аз ин маблағ расонидан ройгон */
  freeDeliveryFrom: number;
  /** Нархи расонидан, вақте ки ройгон нест */
  deliveryPrice: number;
};
export type OrderItem = { name: string; sizeLabel: string | null; price: number; quantity: number; lineTotal: number; image: string | null };
export type CustomerOrder = {
  number: number;
  /** ISO (UTC) */
  createdAt: string;
  status: "new" | "confirmed" | "delivering" | "delivered" | "cancelled";
  address: string;
  comment: string | null;
  /** null — "ҳарчи зудтар" */
  deliveryFrom: string | null;
  deliveryTo: string | null;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  items: OrderItem[];
};
export type OrderPlaced = {
  number: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  /** wa.me/{рақами мағоза}?text={фармоиш} */
  whatsAppUrl: string;
  ownerNotified: boolean;
};
export type LoginChannel = "sms" | "telegram";
export type CodeRequested = {
  phone: string;
  channel: LoginChannel;
  resendAfterSeconds: number;
  devCode: string | null;
  /** Пайванди бот — агар рақам ҳанӯз ба Telegram пайваст нашуда бошад */
  telegramUrl: string | null;
};

/** code — калиди хато барои тарҷума (dict.auth.errors): invalid_phone, wrong_code, rate, network, ... */
export class ClientApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ClientApiError(0, "network");
  }
  if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T;
  if (res.status === 429) throw new ClientApiError(429, "rate");
  const data = (await res.json().catch(() => null)) as { errors?: Record<string, string[]> } | null;
  const first = data?.errors ? Object.values(data.errors).flat()[0] : undefined;
  throw new ClientApiError(res.status, typeof first === "string" ? first : "unknown");
}

export type DeliverySlot = { start: string; end: string; from: string; to: string };
export type DeliveryOptions = {
  asap: boolean;
  days: { date: string; offset: number; slots: DeliverySlot[] }[];
  paymentMethods: string[];
};

export const clientApi = {
  me: () => request<Customer>("/api/auth/me"),
  channels: () => request<{ sms: boolean; telegram: boolean }>("/api/auth/channels"),
  requestCode: (phone: string, channel: LoginChannel) => request<CodeRequested>("/api/auth/code", "POST", { phone, channel }),
  verify: (phone: string, code: string) => request<Customer>("/api/auth/verify", "POST", { phone, code }),
  logout: () => request<void>("/api/auth/logout", "POST"),
  favoriteIds: () => request<number[]>("/api/favorites/ids"),
  favorites: () => request<Product[]>("/api/favorites"),
  addFavorite: (id: number) => request<void>(`/api/favorites/${id}`, "PUT"),
  removeFavorite: (id: number) => request<void>(`/api/favorites/${id}`, "DELETE"),
  cart: () => request<Cart>("/api/cart"),
  /** "Ҳамаашро ба сабад": молҳои маҷмӯа. */
  addBundle: (bundleId: number) =>
    request<{ cart: Cart; unavailable: string[] }>(`/api/cart/bundle/${bundleId}`, "POST"),
  /** "Боз харидан": молҳои фармоиши гузашта ба сабад; unavailable — номи молҳое, ки дигар нестанд. */
  reorder: (orderNumber: number) =>
    request<{ cart: Cart; unavailable: string[] }>(`/api/cart/reorder/${orderNumber}`, "POST"),
  setCartQuantity: (id: number, quantity: number) => request<Cart>(`/api/cart/${id}`, "PUT", { quantity }),
  clearCart: () => request<Cart>("/api/cart", "DELETE"),
  /** Сабади меҳмон (бе логин): нарх ва дастрасӣ аз сервер. Молҳои нестшуда дар ҷавоб намеоянд. */
  previewCart: (items: CartLine[]) => request<Cart>("/api/cart/preview", "POST", { items }),
  /** Баъд аз даромад: сабади меҳмон ба сабади аккаунт (миқдори калонтар мемонад). */
  mergeCart: (items: CartLine[]) => request<Cart>("/api/cart/merge", "POST", { items }),
  orders: (page: number) => request<{ items: CustomerOrder[]; total: number; page: number; pageSize: number }>(`/api/orders?page=${page}`),
  /** Вақтҳои расонидан ва тарзҳои пардохт (соати Душанбе). */
  deliveryOptions: () => request<DeliveryOptions>("/api/delivery/options"),
  /**
   * deliveryStart: null — "ҳарчи зудтар"; paymentMethod: cash | alif | dc | korti_milli.
   * requestId — ҳамон калид дар такрор (интернети суст): сервер фармоиши дуюм намесозад.
   */
  placeOrder: (address: string, comment: string, deliveryStart: string | null, paymentMethod: string, requestId: string) =>
    request<OrderPlaced>("/api/orders", "POST", { address, comment, deliveryStart, paymentMethod, requestId }),
};

export type CartLine = { productId: number; quantity: number };

/** UUID v4. crypto.randomUUID танҳо дар HTTPS/localhost аст — дар http-и шабакаи дохилӣ getRandomValues. */
export function newRequestId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Роҳи нисбии файл ("/uploads/...") → URL-и пурра (дар браузер). */
export const clientFileUrl = (path: string) => toFileUrl(API_URL, path);

/** "+992900000001" → "+992 90 000 00 01" */
export function formatPhone(e164: string) {
  const d = e164.replace(/\D/g, "").slice(-9);
  return d.length === 9 ? `+992 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}` : e164;
}
