"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { LoginModal } from "@/customer/LoginModal";
import { ClientApiError, clientApi } from "@/lib/clientApi";
import type { Cart, Customer } from "@/lib/clientApi";
import { loadGuestCart, saveGuestCart, toCartLines, withQuantity } from "@/lib/guestCart";
import type { GuestLine } from "@/lib/guestCart";

/** Сабади холии меҳмон (нархи расонидан дар экрани холӣ лозим нест). */
const EMPTY_CART: Cart = { items: [], totalQuantity: 0, totalPrice: 0, discount: 0, discounts: [], deliveryFee: 0, freeDeliveryFrom: 0, deliveryPrice: 0 };

type CustomerState = {
  /** undefined — ҳанӯз санҷида мешавад; null — ворид нашудааст */
  user: Customer | null | undefined;
  isFavorite: (productId: number) => boolean;
  /** ❤️: агар ворид нашуда бошад — аввал равзанаи даромад, баъд илова мешавад */
  toggleFavorite: (productId: number) => void;
  /**
   * Сабад: ворид шуда — аз аккаунт; меҳмон — молҳо дар браузер, нарх аз сервер.
   * null — ҳанӯз бор нашудааст.
   */
  cart: Cart | null;
  /** Миқдори мол дар сабад (бо назардошти тағйироти ҳанӯз нафиристода) */
  cartQuantity: (productId: number) => number;
  /** Шумораи умумии молҳо (барои badge) */
  cartCount: number;
  /** Миқдорро муқаррар мекунад (0 — нест). Меҳмон — дар браузер (даромад танҳо ҳангоми фармоиш). */
  setCartQuantity: (productId: number, quantity: number) => void;
  clearCart: () => Promise<void>;
  /** Сабадро аз сервер аз нав мегирад (масалан, баъд аз фармоиш) */
  refreshCart: () => Promise<void>;
  /** Вақте ки ҳамаи тағйироти сабад ба сервер расиданд */
  waitCart: () => Promise<void>;
  /** Агар ворид нашуда бошад — равзанаи даромад; баъд аз даромад амал иҷро мешавад. */
  requireLogin: (action: () => void) => void;
  /** Формаи даромад инро баъд аз тасдиқи рамз даъват мекунад */
  completeLogin: (user: Customer) => Promise<void>;
  logout: () => Promise<void>;
};

const CustomerContext = createContext<CustomerState | null>(null);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Customer | null | undefined>(undefined);
  const [favoriteIds, setFavoriteIds] = useState<ReadonlySet<number>>(new Set());
  const [cart, setCart] = useState<Cart | null>(null);
  // Миқдорҳое, ки дар экран аллакай иваз шудаанд, вале сервер ҳанӯз ҷавоб надодааст
  const [pending, setPending] = useState<ReadonlyMap<number, number>>(new Map());
  const [loginOpen, setLoginOpen] = useState(false);
  // Амале, ки баъд аз даромад иҷро мешавад (масалан, илова кардани ҳамон мол)
  const afterLogin = useRef<(() => void) | null>(null);
  // Дархостҳои сабад бо навбат — ҷавобҳо ҳеҷ гоҳ омехта намешаванд
  const cartQueue = useRef<Promise<unknown>>(Promise.resolve());
  // Сабади меҳмон (localStorage): мол ва миқдор; нарх — аз /api/cart/preview
  const [guestLines, setGuestLines] = useState<readonly GuestLine[]>([]);
  const [previewTick, setPreviewTick] = useState(0);

  /** Баъд аз даромад: писандидаҳо ва сабад; сабади меҳмон (агар бошад) ба аккаунт ҳамроҳ мешавад. */
  const loadUserData = useCallback(async () => {
    const guest = loadGuestCart();
    const loadCart = async () => {
      if (guest.length > 0) {
        try {
          const merged = await clientApi.mergeCart(toCartLines(guest));
          saveGuestCart([]);
          setGuestLines([]);
          return merged;
        } catch {
          // Ҳамроҳ нашуд — сабади меҳмон дар браузер мемонад, сабади аккаунтро нишон медиҳем
        }
      }
      return clientApi.cart();
    };
    const [ids, c] = await Promise.allSettled([clientApi.favoriteIds(), loadCart()]);
    if (ids.status === "fulfilled") setFavoriteIds(new Set(ids.value));
    if (c.status === "fulfilled") setCart(c.value);
  }, []);

  useEffect(() => {
    clientApi.me().then(
      (u) => {
        setUser(u);
        void loadUserData();
      },
      () => {
        setUser(null);
        setGuestLines(loadGuestCart());
      },
    );
  }, [loadUserData]);

  // Меҳмон: нарх, ном ва дастрасии молҳои сабад аз сервер (каме таъхир — клики пай дар пай як дархост)
  useEffect(() => {
    if (user !== null) return;
    // false — сабад аллакай иваз шуд ё мизоҷ ворид шуд: ҷавоби ин дархост нодида гирифта мешавад
    let current = true;
    const lines = guestLines;
    const timer = setTimeout(
      async () => {
        if (lines.length === 0) return setCart(EMPTY_CART);
        try {
          const c = await clientApi.previewCart(toCartLines(lines));
          if (!current) return;
          setCart(c);
          // Молҳое, ки дигар вуҷуд надоранд, аз сабади браузер хориҷ мешаванд
          const known = new Set(c.items.map((i) => i.productId));
          const gone = new Set(lines.filter(([id]) => !known.has(id)).map(([id]) => id));
          if (gone.size > 0) {
            setGuestLines((prev) => {
              const next = prev.filter(([id]) => !gone.has(id));
              saveGuestCart(next);
              return next;
            });
          }
        } catch {
          // Сервер ҷавоб надод — пас аз 3 сония боз (сабади браузер дахолат намебинад)
          if (current) setTimeout(() => setPreviewTick((t) => t + 1), 3000);
        }
      },
      lines.length === 0 ? 0 : 250,
    );
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [user, guestLines, previewTick]);

  const onSessionError = useCallback((e: unknown) => {
    if (e instanceof ClientApiError && e.status === 401) {
      setUser(null); // сессия тамом шуд
      setCart(null);
    }
  }, []);

  /** Агар ворид нашуда бошад — равзанаи даромад; баъд аз даромад амал иҷро мешавад. */
  const requireLogin = useCallback(
    (action: () => void) => {
      if (user) return action();
      afterLogin.current = action;
      setLoginOpen(true);
    },
    [user],
  );

  // --- ❤️ ---

  const setFavorite = useCallback(
    async (id: number, on: boolean) => {
      const apply = (add: boolean) =>
        setFavoriteIds((s) => {
          const next = new Set(s);
          if (add) next.add(id);
          else next.delete(id);
          return next;
        });
      apply(on); // оптимистӣ
      try {
        await (on ? clientApi.addFavorite(id) : clientApi.removeFavorite(id));
      } catch (e) {
        apply(!on);
        onSessionError(e);
      }
    },
    [onSessionError],
  );

  const toggleFavorite = useCallback(
    (id: number) => {
      if (!user) return requireLogin(() => void setFavorite(id, true));
      void setFavorite(id, !favoriteIds.has(id));
    },
    [user, favoriteIds, setFavorite, requireLogin],
  );

  // --- Сабад ---

  const sendCartQuantity = useCallback(
    (id: number, quantity: number) => {
      setPending((m) => new Map(m).set(id, quantity));
      cartQueue.current = cartQueue.current.then(async () => {
        try {
          setCart(await clientApi.setCartQuantity(id, quantity));
        } catch (e) {
          onSessionError(e);
        } finally {
          // Танҳо агар пас аз ин дархост тағйири нав набошад
          setPending((m) => {
            if (m.get(id) !== quantity) return m;
            const next = new Map(m);
            next.delete(id);
            return next;
          });
        }
      });
    },
    [onSessionError],
  );

  const cartQuantity = useCallback(
    (id: number) =>
      user
        ? (pending.get(id) ?? cart?.items.find((i) => i.productId === id)?.quantity ?? 0)
        : (guestLines.find(([pid]) => pid === id)?.[1] ?? 0),
    [user, pending, cart, guestLines],
  );

  const setCartQuantity = useCallback(
    (id: number, quantity: number) => {
      const q = Math.max(0, Math.min(99, quantity));
      if (user) return sendCartQuantity(id, q);
      // Меҳмон (ё ҳанӯз санҷида мешавад): дар браузер; агар сессия бошад — баъд ба аккаунт ҳамроҳ мешавад
      setGuestLines((prev) => {
        const next = withQuantity(prev, id, q);
        saveGuestCart(next);
        return next;
      });
    },
    [user, sendCartQuantity],
  );

  const clearCart = useCallback(async () => {
    if (!user) {
      saveGuestCart([]);
      setGuestLines([]);
      return;
    }
    try {
      setCart(await clientApi.clearCart());
      setPending(new Map());
    } catch (e) {
      onSessionError(e);
    }
  }, [user, onSessionError]);

  const refreshCart = useCallback(async () => {
    if (!user) return setPreviewTick((t) => t + 1);
    try {
      setCart(await clientApi.cart());
      setPending(new Map());
    } catch (e) {
      onSessionError(e);
    }
  }, [user, onSessionError]);

  const waitCart = useCallback(() => cartQueue.current.then(() => undefined), []);

  const cartCount = useMemo(() => {
    if (!user) {
      // Меҳмон: аз браузер (фавран), бе молҳое, ки сервер «дастрас нест» гуфт
      const unavailable = new Set(cart?.items.filter((i) => !i.available).map((i) => i.productId));
      return guestLines.reduce((sum, [id, q]) => sum + (unavailable.has(id) ? 0 : q), 0);
    }
    const quantities = new Map<number, number>();
    for (const i of cart?.items ?? []) if (i.available) quantities.set(i.productId, i.quantity);
    for (const [id, q] of pending) quantities.set(id, q);
    let sum = 0;
    for (const q of quantities.values()) sum += q;
    return sum;
  }, [user, cart, pending, guestLines]);

  // --- Даромад / баромад ---

  const completeLogin = useCallback(
    async (u: Customer) => {
      setUser(u);
      setLoginOpen(false);
      await loadUserData();
      afterLogin.current?.();
      afterLogin.current = null;
    },
    [loadUserData],
  );

  const logout = useCallback(async () => {
    await clientApi.logout().catch(() => {});
    setUser(null);
    setFavoriteIds(new Set());
    setCart(null);
    setPending(new Map());
    // Сабади аккаунт дар сервер мемонад; дар браузер сабади нави меҳмон аз сифр
    saveGuestCart([]);
    setGuestLines([]);
  }, []);

  const value = useMemo<CustomerState>(
    () => ({
      user,
      isFavorite: (id) => favoriteIds.has(id),
      toggleFavorite,
      cart,
      cartQuantity,
      cartCount,
      setCartQuantity,
      clearCart,
      refreshCart,
      waitCart,
      requireLogin,
      completeLogin,
      logout,
    }),
    [user, favoriteIds, toggleFavorite, cart, cartQuantity, cartCount, setCartQuantity, clearCart, refreshCart, waitCart, requireLogin, completeLogin, logout],
  );

  return (
    <CustomerContext value={value}>
      {children}
      {loginOpen && (
        <LoginModal
          onClose={() => {
            afterLogin.current = null;
            setLoginOpen(false);
          }}
        />
      )}
    </CustomerContext>
  );
}

export function useCustomer(): CustomerState {
  const ctx = use(CustomerContext);
  if (!ctx) throw new Error("useCustomer бояд дар дохили <CustomerProvider> истифода шавад");
  return ctx;
}
