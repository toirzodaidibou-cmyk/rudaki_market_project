// Ёрдамчиҳои ҷуғрофӣ барои харита (бе китобхона).

export type LatLng = { lat: number; lng: number };

/** Ҳалқаи GeoJSON: [lng, lat][] */
export type Ring = [number, number][];

/** Оё нуқта дар дохили бисёркунҷа аст (ray casting). rings[0] — берунӣ, боқӣ — сӯрохиҳо. */
export function pointInPolygon(p: LatLng, rings: Ring[]): boolean {
  const inRing = (ring: Ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  return rings.length > 0 && inRing(rings[0]) && !rings.slice(1).some(inRing);
}

/** Масофаи рост байни ду нуқта (км), формулаи haversine. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type Route = {
  /** [lat, lng][] — барои Leaflet */
  path: [number, number][];
  km: number;
  minutes: number;
  /** true — роҳ аз сервер ёфт нашуд, хати рост ва вақти тахминӣ */
  approximate: boolean;
};

/**
 * Роҳи мошин аз A ба B (OSRM). Агар сервер ҷавоб надиҳад — хати рост
 * (масофа × 1.35, суръати миёна 30 км/соат).
 * ⚠️ router.project-osrm.org — сервери намоишӣ; барои production сервери худ ё хизмати пулакӣ лозим.
 */
export async function fetchRoute(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<Route> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: anySignal(signal, 8000) });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as {
      routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
    };
    const r = data.routes?.[0];
    if (!r) throw new Error("no route");
    return {
      path: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      km: r.distance / 1000,
      minutes: r.duration / 60,
      approximate: false,
    };
  } catch (e) {
    if (signal?.aborted) throw e;
    const km = distanceKm(from, to) * 1.35;
    return { path: [[from.lat, from.lng], [to.lat, to.lng]], km, minutes: (km / 30) * 60, approximate: true };
  }
}

/** Суроғаи нуқта (Nominatim). null — агар ёфт нашавад. */
export async function reverseGeocode(p: LatLng, lang: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${p.lat}&lon=${p.lng}` +
      `&accept-language=${encodeURIComponent(lang)},ru`;
    const res = await fetch(url, { signal: anySignal(signal, 8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: Record<string, string>;
      display_name?: string;
    };
    const a = data.address ?? {};
    const parts = [
      a.village ?? a.town ?? a.city ?? a.hamlet ?? a.suburb,
      a.road,
      a.house_number,
    ].filter(Boolean);
    // Бе кӯча (масалан, танҳо номи ҷамоат) — номи ноҳия ҳам илова шавад
    if (parts.length < 2 && a.county) parts.unshift(a.county);
    return parts.length > 0 ? parts.join(", ") : (data.display_name?.split(",").slice(0, 3).join(",") ?? null);
  } catch {
    return null;
  }
}

function anySignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

// --- Суроғаи интихобшуда дар харита → майдони суроғаи сабад ---

const ADDRESS_KEY = "delivery-address";

export function saveDeliveryAddress(text: string): void {
  try {
    localStorage.setItem(ADDRESS_KEY, text);
  } catch {
    // localStorage дастрас нест
  }
}

export function loadDeliveryAddress(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(ADDRESS_KEY) ?? "";
  } catch {
    return "";
  }
}
