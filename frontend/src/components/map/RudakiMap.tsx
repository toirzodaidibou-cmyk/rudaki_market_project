"use client";

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import L from "leaflet";
import { ClockIcon, MapPinIcon } from "@/components/ui/icons";
import { DELIVERY_FEE, DELIVERY_ZONES, FREE_DELIVERY_FROM, PREPARATION_MIN, STORE_LOCATION } from "@/config/store";
import type { DeliveryZone } from "@/config/store";
import { format, localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/I18nProvider";
import { distanceKm, fetchRoute, pointInPolygon, reverseGeocode, saveDeliveryAddress } from "@/lib/geo";
import type { LatLng, Ring, Route } from "@/lib/geo";

type LayerKey = "scheme" | "satellite" | "hybrid";
const LAYERS: LayerKey[] = ["scheme", "satellite", "hybrid"];

// Тайлҳо. ⚠️ tile.openstreetmap.org ва Esri барои трафики калон/тиҷоратӣ шартҳои худро доранд —
// пеш аз production хизмати тайлҳои худ ё пулакӣ (бо калид) лозим. Мавзӯи торики "Схема" — бо CSS filter.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
function baseLayers(key: LayerKey): L.TileLayer[] {
  if (key === "scheme") {
    return [
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }),
    ];
  }
  const imagery = L.tileLayer(`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`, {
    maxZoom: 19,
    maxNativeZoom: 18,
    attribution: "Tiles &copy; Esri, Maxar, Earthstar Geographics",
  });
  if (key === "satellite") return [imagery];
  return [
    imagery,
    L.tileLayer(`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19, maxNativeZoom: 18 }),
    L.tileLayer(`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`, { maxZoom: 19, maxNativeZoom: 18 }),
  ];
}

// Мавзӯи торик/равшан-и сайт (data-theme дар <html>)
function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
const isDarkTheme = () => document.documentElement.dataset.theme === "dark";

type Pick =
  | { point: LatLng; inside: false }
  | {
      point: LatLng;
      inside: true;
      zone: DeliveryZone;
      route: Route | null;
      /** undefined — ҳанӯз муайян мешавад; null — ёфт нашуд */
      address: string | null | undefined;
    };

const storeIcon = L.divIcon({
  className: "",
  html: '<div class="rm-pin"><span>🛒</span></div>',
  iconSize: [44, 44],
  iconAnchor: [22, 44],
});
const meIcon = (outside: boolean) =>
  L.divIcon({ className: "", html: `<div class="rm-me" data-outside="${outside}"></div>`, iconSize: [22, 22], iconAnchor: [11, 11] });

const roundUp5 = (n: number) => Math.ceil(n / 5) * 5;

/**
 * Харитаи воқеии ноҳияи Рӯдакӣ:
 *  • 3 намуд: Схема / Спутник / Гибрид;
 *  • берун аз ноҳия торик карда шудааст, ҳудуди ноҳия — хати зард;
 *  • 3 минтақа аз мағоза: наздик / миёна / дур;
 *  • «Ҷои ман» ё зер кардани харита → масофа, роҳ (маршрут), вақти расонидан ва суроға.
 */
export default function RudakiMap() {
  const { locale, dict } = useI18n();
  const t = dict.map;
  const dark = useSyncExternalStore(subscribeTheme, isDarkTheme, () => false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const ringsRef = useRef<Ring[]>([]);
  const baseRef = useRef<L.TileLayer[]>([]);
  const meRef = useRef<L.Marker | null>(null);
  const routeRef = useRef<L.LayerGroup | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const homeBoundsRef = useRef<L.LatLngBounds | null>(null);

  const [layer, setLayer] = useState<LayerKey>("scheme");
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);

  /** Нуқтаи интихобшуда → тафтиши ноҳия, минтақа, роҳ ва суроға. */
  const choose = useCallback(
    async (point: LatLng) => {
      const map = mapRef.current;
      if (!map) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setNotice(null);
      routeRef.current?.clearLayers();

      const inside = pointInPolygon(point, ringsRef.current);
      meRef.current?.remove();
      meRef.current = L.marker([point.lat, point.lng], { icon: meIcon(!inside), keyboard: false }).addTo(map);

      if (!inside) {
        // Нишон диҳем, ки нуқта аз ноҳия чӣ қадар дур аст
        const home = homeBoundsRef.current;
        if (home) map.flyToBounds(L.latLngBounds(home.getSouthWest(), home.getNorthEast()).extend([point.lat, point.lng]), { padding: [24, 24], duration: 0.6 });
        setPick({ point, inside: false });
        return;
      }
      if (map.getZoom() < 12) map.setView([point.lat, point.lng], 13);
      const straight = distanceKm(STORE_LOCATION, point);
      const zone = DELIVERY_ZONES.find((z) => straight <= z.maxKm) ?? DELIVERY_ZONES[DELIVERY_ZONES.length - 1];
      setPick({ point, inside: true, zone, route: null, address: undefined });

      const [route, address] = await Promise.all([
        fetchRoute(STORE_LOCATION, point, controller.signal).catch(() => null),
        reverseGeocode(point, locale, controller.signal),
      ]);
      if (controller.signal.aborted) return;

      if (route && routeRef.current) {
        // Хати роҳ: "ҷилд"-и сафед + ранги минтақа
        L.polyline(route.path, { color: "#fff", weight: 9, opacity: 0.9, pane: "route" }).addTo(routeRef.current);
        L.polyline(route.path, {
          color: zone.color,
          weight: 5,
          pane: "route",
          dashArray: route.approximate ? "8 10" : undefined,
        }).addTo(routeRef.current);
        map.fitBounds(L.latLngBounds(route.path).extend([STORE_LOCATION.lat, STORE_LOCATION.lng]), {
          padding: [48, 48],
          maxZoom: 16,
        });
      }
      setPick({ point, inside: true, zone, route, address });
    },
    [locale],
  );

  const onMapClick = useEffectEvent((point: LatLng) => void choose(point));

  // Сохтани харита (як бор)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const map = L.map(el, {
      zoomControl: false,
      scrollWheelZoom: false, // то клик — саҳифа бо чарх ба поён меравад, на харита
      attributionControl: true,
    }).setView([STORE_LOCATION.lat, STORE_LOCATION.lng], 10);
    map.attributionControl.setPrefix(false);
    mapRef.current = map;

    map.createPane("mask").style.zIndex = "450";
    map.createPane("outline").style.zIndex = "460";
    map.createPane("route").style.zIndex = "470";
    routeRef.current = L.layerGroup().addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.on("focus", () => map.scrollWheelZoom.enable());
    map.on("blur", () => map.scrollWheelZoom.disable());

    let cancelled = false;
    fetch("/geo/rudaki.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((geo: { geometry: { coordinates: Ring[] } }) => {
        if (cancelled) return;
        const rings = geo.geometry.coordinates;
        ringsRef.current = rings;
        const district = rings[0].map(([lng, lat]) => L.latLng(lat, lng));

        // Ҳама ҷо ба ғайр аз ноҳия — торик (ҷаҳон бо "сӯрохӣ"-и ноҳия)
        const world = [L.latLng(-85, -180), L.latLng(-85, 180), L.latLng(85, 180), L.latLng(85, -180)];
        L.polygon([world, district], {
          pane: "mask",
          stroke: false,
          fillColor: "#0b0c10",
          fillOpacity: 0.5,
          interactive: false,
        }).addTo(map);
        L.polygon(district, { pane: "outline", color: "#111", weight: 6, opacity: 0.35, fill: false, interactive: false }).addTo(map);
        // Ҳудуди ноҳия — бо ранги дизайни ҷорӣ (--accent)
        const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#11a24f";
        L.polygon(district, { pane: "outline", color: accent, weight: 3, fill: false, interactive: false }).addTo(map);

        // Минтақаҳо: дур (то 15 км) ва наздик (то 5 км); берун аз 15 км — "дур" (тамоми ноҳия)
        for (const z of [...DELIVERY_ZONES].reverse()) {
          if (!Number.isFinite(z.maxKm)) continue;
          L.circle([STORE_LOCATION.lat, STORE_LOCATION.lng], {
            radius: z.maxKm * 1000,
            color: z.color,
            weight: 2,
            opacity: 0.9,
            dashArray: "6 6",
            fillColor: z.color,
            fillOpacity: 0.1,
            interactive: false,
          }).addTo(map);
        }

        L.marker([STORE_LOCATION.lat, STORE_LOCATION.lng], { icon: storeIcon, zIndexOffset: 1000, keyboard: false })
          .bindTooltip("RUDAKI MARKET", { direction: "top", offset: [0, -40] })
          .addTo(map);

        const bounds = L.latLngBounds(district);
        homeBoundsRef.current = bounds;
        map.setMinZoom(Math.max(8, map.getBoundsZoom(bounds, false, L.point(24, 24)) - 1));
        map.setMaxBounds(bounds.pad(0.6));
        map.fitBounds(bounds, { padding: [12, 12] });
        setReady(true);
      })
      .catch(() => !cancelled && setFailed(true));

    // Андозаи контейнер иваз шавад (масалан, гардиши телефон) — харита тоза кашида шавад
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);

    return () => {
      cancelled = true;
      ro.disconnect();
      abortRef.current?.abort();
      // Аниматсияи нотамом (flyTo/zoom) пас аз remove хато медиҳад — аввал қатъ мекунем
      map.stop();
      map.off();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Тугмаҳои zoom бо матни забони ҷорӣ
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const zoom = L.control.zoom({ position: "bottomright", zoomInTitle: t.zoomIn, zoomOutTitle: t.zoomOut }).addTo(map);
    return () => {
      zoom.remove();
    };
  }, [t.zoomIn, t.zoomOut]);

  // Намуди харита (ва мавзӯи торик барои "Схема")
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const layers = baseLayers(layer);
    for (const l of layers) l.addTo(map).bringToBack();
    const old = baseRef.current;
    baseRef.current = layers;
    for (const l of old) l.remove();
  }, [layer]);

  function locate() {
    if (!navigator.geolocation) {
      setNotice(t.geoUnavailable);
      return;
    }
    setLocating(true);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        void choose(point);
      },
      (err) => {
        setLocating(false);
        setNotice(err.code === err.PERMISSION_DENIED ? t.geoDenied : t.geoUnavailable);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  function recenter() {
    abortRef.current?.abort();
    routeRef.current?.clearLayers();
    meRef.current?.remove();
    meRef.current = null;
    setPick(null);
    setNotice(null);
    if (homeBoundsRef.current) mapRef.current?.flyToBounds(homeBoundsRef.current, { padding: [12, 12], duration: 0.6 });
  }

  const nf = new Intl.NumberFormat(locale === "en" ? "en-US" : "ru-RU", { maximumFractionDigits: 1 });
  const money = (v: number) => `${v} ${dict.product.currency}`;
  const zoneEta = (z: DeliveryZone) => format(t.minutes, { a: String(z.eta[0]), b: String(z.eta[1]) });

  return (
    <div className="rm-map overflow-hidden rounded-[28px] bg-surface" data-dark-tiles={dark && layer === "scheme"}>
      {/* Худи харита. isolate — z-index-ҳои Leaflet аз навбар/футер боло намебароянд */}
      <div className="relative isolate h-[320px] sm:h-[400px] lg:h-[460px]">
        <div ref={containerRef} className="absolute inset-0" aria-label={t.title} />

        {!ready && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-surface text-sm text-muted">
            {failed ? t.loadError : <span className="h-8 w-8 animate-spin rounded-full border-3 border-accent border-t-transparent" />}
          </div>
        )}

        {/* Намуди харита: Схема / Спутник / Гибрид */}
        <div
          role="radiogroup"
          aria-label={t.layersLabel}
          className="absolute top-3 left-3 z-[1000] flex rounded-2xl bg-background/90 p-1 shadow-lg backdrop-blur"
        >
          {LAYERS.map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={layer === key}
              onClick={() => setLayer(key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${
                layer === key ? "bg-accent text-on-accent shadow" : "text-foreground hover:bg-surface-hover"
              }`}
            >
              {t.layers[key]}
            </button>
          ))}
        </div>

        {/* Ҷои ман / Ба мағоза */}
        <div className="absolute bottom-3 left-3 z-[1000] flex gap-2">
          <button
            type="button"
            onClick={locate}
            disabled={locating || !ready}
            className="flex h-11 items-center gap-2 rounded-2xl bg-[#2563eb] px-4 text-sm font-bold text-white shadow-lg transition-transform active:scale-95 disabled:opacity-70"
          >
            <MapPinIcon width={18} height={18} />
            {locating ? t.locating : t.myLocation}
          </button>
          <button
            type="button"
            onClick={recenter}
            disabled={!ready}
            title={t.recenter}
            aria-label={t.recenter}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background text-lg shadow-lg transition-transform active:scale-95"
          >
            🛒
          </button>
        </div>
      </div>

      {/* Маълумот дар зери харита */}
      <div className="space-y-3 p-4 sm:p-5" aria-live="polite">
        {notice && <p className="rounded-xl bg-[#ef4444]/10 px-3 py-2 text-sm font-medium text-[#dc2626]">{notice}</p>}

        {!pick && (
          <>
            <p className="text-sm text-muted">{t.tapHint}</p>
            <ul className="flex flex-wrap gap-2">
              {DELIVERY_ZONES.map((z) => (
                <li key={z.key} className="flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: z.color }} />
                  <span className="font-semibold text-foreground">{t.zones[z.key]}</span>
                  <span className="text-muted">{zoneEta(z)}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {pick && !pick.inside && (
          <p className="rounded-xl bg-[#ef4444]/10 px-3 py-2.5 text-sm font-medium text-[#dc2626]">{t.outside}</p>
        )}

        {pick?.inside && (
          <>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label={t.zone}>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: pick.zone.color }} />
                  {t.zones[pick.zone.key]}
                </span>
              </Stat>
              <Stat label={t.distance}>
                {pick.route ? format(t.km, { n: nf.format(pick.route.km) }) : <Dots />}
              </Stat>
              <Stat label={t.eta}>
                {pick.route ? (
                  <span className="flex items-center gap-1">
                    <ClockIcon width={15} height={15} />
                    {format(t.etaValue, { n: String(roundUp5(PREPARATION_MIN + pick.route.minutes)) })}
                  </span>
                ) : (
                  <Dots />
                )}
              </Stat>
              <Stat label={t.delivery}>
                <span className="text-sm">
                  {format(t.deliveryValue, { fee: money(DELIVERY_FEE), free: money(FREE_DELIVERY_FROM) })}
                </span>
              </Stat>
            </dl>
            {pick.route?.approximate && <p className="text-xs text-muted">* {t.approx}</p>}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex min-w-0 items-start gap-1.5 text-sm text-foreground">
                <MapPinIcon width={16} height={16} className="mt-0.5 shrink-0 text-muted" />
                <span className="min-w-0 break-words">
                  {pick.address === undefined
                    ? t.addressLoading
                    : (pick.address ?? `${pick.point.lat.toFixed(5)}, ${pick.point.lng.toFixed(5)}`)}
                </span>
              </p>
              <Link
                href={localizePath(locale, "/cart")}
                onClick={() => {
                  const coords = `${pick.point.lat.toFixed(6)}, ${pick.point.lng.toFixed(6)}`;
                  saveDeliveryAddress(pick.address ? `${pick.address} (${coords})` : coords);
                }}
                className="flex h-11 shrink-0 items-center justify-center rounded-2xl bg-accent px-5 text-sm font-bold text-on-accent transition-transform active:scale-95"
              >
                {t.orderHere}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-background px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-bold text-foreground">{children}</dd>
    </div>
  );
}

function Dots() {
  return <span className="inline-block h-4 w-12 animate-pulse rounded bg-surface-hover align-middle" />;
}
