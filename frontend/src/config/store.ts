// Ҷойгиршавии мағоза ва қоидаҳои расонидан (барои харитаи саҳифаи асосӣ).
// ⚠️ Мувақтан: маркази Сомониён. Пас аз гирифтани пайванди Google Maps-и мағоза — иваз шавад.

export const STORE_LOCATION = { lat: 38.4419092, lng: 68.7738867 } as const;

/** Ҳамон қоидаҳои backend (Orders:DeliveryFee / Orders:FreeDeliveryFrom). */
export const DELIVERY_FEE = 10;
export const FREE_DELIVERY_FROM = 200;

/** Минтақаҳои расонидан аз мағоза (масофаи рост, км) ва вақти тахминӣ (дақиқа). */
export const DELIVERY_ZONES = [
  { key: "near", maxKm: 5, color: "#22c55e", eta: [30, 45] },
  { key: "mid", maxKm: 15, color: "#f59e0b", eta: [45, 90] },
  { key: "far", maxKm: Infinity, color: "#ef4444", eta: [90, 150] },
] as const;

export type DeliveryZone = (typeof DELIVERY_ZONES)[number];

/** Вақти тайёр кардани фармоиш то баромадани курйер (дақиқа). */
export const PREPARATION_MIN = 20;
