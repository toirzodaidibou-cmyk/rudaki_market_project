// Дархостҳо аз браузер ба backend (бо cookie-и мизоҷ). Барои server — src/lib/api.ts.
import type { Product } from "@/lib/api";

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
export type Cart = {
  items: CartItem[];
  totalQuantity: number;
  totalPrice: number;
  /** Расонидан барои ҳамин сабад (0 — ройгон) */
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
  status: "new";
  address: string;
  comment: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: OrderItem[];
};
export type OrderPlaced = {
  number: number;
  subtotal: number;
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
  /** "Боз харидан": молҳои фармоиши гузашта ба сабад; unavailable — номи молҳое, ки дигар нестанд. */
  reorder: (orderNumber: number) =>
    request<{ cart: Cart; unavailable: string[] }>(`/api/cart/reorder/${orderNumber}`, "POST"),
  setCartQuantity: (id: number, quantity: number) => request<Cart>(`/api/cart/${id}`, "PUT", { quantity }),
  clearCart: () => request<Cart>("/api/cart", "DELETE"),
  orders: (page: number) => request<{ items: CustomerOrder[]; total: number; page: number; pageSize: number }>(`/api/orders?page=${page}`),
  placeOrder: (address: string, comment: string) => request<OrderPlaced>("/api/orders", "POST", { address, comment }),
};

/** Роҳи нисбии файл ("/uploads/...") → URL-и пурра (дар браузер). */
export const clientFileUrl = (path: string) => `${API_URL}${path}`;

/** "+992900000001" → "+992 90 000 00 01" */
export function formatPhone(e164: string) {
  const d = e164.replace(/\D/g, "").slice(-9);
  return d.length === 9 ? `+992 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}` : e164;
}
