// Сабади меҳмон (бе даромад): танҳо мол ва миқдор дар localStorage. Нарх ва дастрасӣ ҳамеша аз сервер.
// Баъд аз даромад ба сабади аккаунт ҳамроҳ мешавад ва аз браузер тоза мешавад.

const KEY = "rm_guest_cart";
const MAX_ITEMS = 200;

/** [productId, quantity] — навтарин аввал. */
export type GuestLine = readonly [number, number];

export function loadGuestCart(): GuestLine[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (l): l is [number, number] =>
          Array.isArray(l) && Number.isInteger(l[0]) && l[0] > 0 && Number.isInteger(l[1]) && l[1] > 0,
      )
      .map(([id, q]) => [id, Math.min(99, q)] as const)
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function saveGuestCart(lines: readonly GuestLine[]) {
  try {
    if (lines.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(lines.slice(0, MAX_ITEMS)));
  } catch {
    // Реҷаи хусусӣ ё хотира пур — сабад танҳо то reload мемонад
  }
}

/** Миқдорро иваз мекунад (0 — нест). Моли нав ба аввали рӯйхат меравад. */
export function withQuantity(lines: readonly GuestLine[], id: number, quantity: number): GuestLine[] {
  const i = lines.findIndex(([pid]) => pid === id);
  if (quantity <= 0) return i < 0 ? [...lines] : lines.filter(([pid]) => pid !== id);
  if (i >= 0) return lines.map((l) => (l[0] === id ? ([id, quantity] as const) : l));
  return [[id, quantity] as const, ...lines].slice(0, MAX_ITEMS);
}

export const toCartLines = (lines: readonly GuestLine[]) => lines.map(([productId, quantity]) => ({ productId, quantity }));
