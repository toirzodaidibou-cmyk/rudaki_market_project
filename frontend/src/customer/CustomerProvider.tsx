"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { LoginModal } from "@/customer/LoginModal";
import { ClientApiError, clientApi } from "@/lib/clientApi";
import type { Cart, Customer } from "@/lib/clientApi";

type CustomerState = {
  /** undefined — ҳанӯз санҷида мешавад; null — ворид нашудааст */
  user: Customer | null | undefined;
  isFavorite: (productId: number) => boolean;
  /** ❤️: агар ворид нашуда бошад — аввал равзанаи даромад, баъд илова мешавад */
  toggleFavorite: (productId: number) => void;
  /** Сабад (аз сервер). null — ворид нашудааст ё ҳанӯз бор нашудааст */
  cart: Cart | null;
  /** Миқдори мол дар сабад (бо назардошти тағйироти ҳанӯз нафиристода) */
  cartQuantity: (productId: number) => number;
  /** Шумораи умумии молҳо (барои badge) */
  cartCount: number;
  /** Миқдорро муқаррар мекунад (0 — нест). Агар ворид нашуда бошад — аввал равзанаи даромад. */
  setCartQuantity: (productId: number, quantity: number) => void;
  clearCart: () => Promise<void>;
  /** Сабадро аз сервер аз нав мегирад (масалан, баъд аз фармоиш) */
  refreshCart: () => Promise<void>;
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

  const loadUserData = useCallback(async () => {
    const [ids, c] = await Promise.allSettled([clientApi.favoriteIds(), clientApi.cart()]);
    if (ids.status === "fulfilled") setFavoriteIds(new Set(ids.value));
    if (c.status === "fulfilled") setCart(c.value);
  }, []);

  useEffect(() => {
    clientApi.me().then(
      (u) => {
        setUser(u);
        void loadUserData();
      },
      () => setUser(null),
    );
  }, [loadUserData]);

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
    (id: number) => pending.get(id) ?? cart?.items.find((i) => i.productId === id)?.quantity ?? 0,
    [pending, cart],
  );

  const setCartQuantity = useCallback(
    (id: number, quantity: number) => {
      const q = Math.max(0, Math.min(99, quantity));
      if (!user) return requireLogin(() => sendCartQuantity(id, Math.max(1, q)));
      sendCartQuantity(id, q);
    },
    [user, requireLogin, sendCartQuantity],
  );

  const clearCart = useCallback(async () => {
    try {
      setCart(await clientApi.clearCart());
      setPending(new Map());
    } catch (e) {
      onSessionError(e);
    }
  }, [onSessionError]);

  const refreshCart = useCallback(async () => {
    try {
      setCart(await clientApi.cart());
      setPending(new Map());
    } catch (e) {
      onSessionError(e);
    }
  }, [onSessionError]);

  const cartCount = useMemo(() => {
    const quantities = new Map<number, number>();
    for (const i of cart?.items ?? []) if (i.available) quantities.set(i.productId, i.quantity);
    for (const [id, q] of pending) quantities.set(id, q);
    let sum = 0;
    for (const q of quantities.values()) sum += q;
    return sum;
  }, [cart, pending]);

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
      completeLogin,
      logout,
    }),
    [user, favoriteIds, toggleFavorite, cart, cartQuantity, cartCount, setCartQuantity, clearCart, refreshCart, completeLogin, logout],
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
