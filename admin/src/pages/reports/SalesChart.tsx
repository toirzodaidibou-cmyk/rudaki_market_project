import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Table2 } from 'lucide-react'
import { formatPrice } from '../../lib/api'
import type { SalesReport } from '../../lib/api'

type Day = SalesReport['daily'][number]
type Metric = 'revenue' | 'orders'

const RANGES = [7, 14, 30] as const
const WEEKDAYS = ['Яш', 'Дш', 'Сш', 'Чш', 'Пш', 'Ҷм', 'Шб']
const WEEKDAYS_FULL = ['Якшанбе', 'Душанбе', 'Сешанбе', 'Чоршанбе', 'Панҷшанбе', 'Ҷумъа', 'Шанбе']

// Ченакҳои график (px)
const PLOT_H = 220
const TOP = 22 // ҷой барои рақами болои сутуни калонтарин
const AXIS_W = 44
const X_AXIS_H = 26
const MAX_BAR = 24

const dayLabel = (date: string) => `${date.slice(8, 10)}.${date.slice(5, 7)}`
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay()

/** 0 / 500 / 1K / 1,5K — барои меҳвари Y. */
function compact(v: number) {
  if (v >= 1000) return `${(v / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}K`
  return v.toLocaleString('ru-RU', { maximumFractionDigits: 0 })
}

/** Қадами «зебо» (1, 2, 2.5, 5 × 10ⁿ) то тақрибан 4 хат. */
function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0]
  const raw = max / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw
  const top = Math.ceil(max / step) * step
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
}

/** Сутун: болояш 4px мудаввар, поёнаш рост (аз хати асос). */
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

/** Графики фурӯши рӯзона: давра (7/14/30), нишондиҳанда (маблағ/фармоиш), тафсилоти рӯз ва ҷадвал. */
export function SalesChart({ daily }: { daily: Day[] }) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(30)
  const [metric, setMetric] = useState<Metric>('revenue')
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [table])

  const days = daily.slice(-range)
  const prev = daily.length >= range * 2 ? daily.slice(-range * 2, -range) : null
  const value = (d: Day) => (metric === 'revenue' ? d.revenue : d.orders)
  const fmt = (v: number) => (metric === 'revenue' ? formatPrice(v) : `${v} фармоиш`)

  const stats = useMemo(() => {
    const revenue = days.reduce((s, d) => s + d.revenue, 0)
    const orders = days.reduce((s, d) => s + d.orders, 0)
    const total = metric === 'revenue' ? revenue : orders
    const prevTotal = prev ? prev.reduce((s, d) => s + (metric === 'revenue' ? d.revenue : d.orders), 0) : null
    const best = days.reduce<Day | null>((b, d) => (value(d) > (b ? value(b) : 0) ? d : b), null)
    const active = days.filter((d) => d.orders > 0).length
    return { revenue, orders, total, prevTotal, best, active }
    // value ба metric вобаста аст
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, prev, metric])

  const ticks = niceTicks(Math.max(0, ...days.map(value)))
  const top = ticks[ticks.length - 1] || 1
  const plotTicks = ticks.length > 1 ? ticks : [0]
  const plotW = width - AXIS_W
  const band = plotW / days.length
  const barW = Math.min(MAX_BAR, Math.max(4, band * 0.62))
  const y = (v: number) => TOP + PLOT_H - (v / top) * PLOT_H
  // Санаҳои поён: ақаллан ~46px байни онҳо (дар телефон камтар нишон дода мешаванд)
  const labelEvery = Math.max(range === 30 ? 5 : range === 14 ? 2 : 1, Math.ceil(46 / band))
  const shown = hover !== null ? days[hover] : null
  const bestIndex = stats.best ? days.indexOf(stats.best) : -1

  const delta = stats.prevTotal !== null && stats.prevTotal > 0 ? (stats.total - stats.prevTotal) / stats.prevTotal : null

  const seg = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${active ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      {/* Сарлавҳа ва рақами асосӣ */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-muted">
            {metric === 'revenue' ? 'Фурӯш' : 'Фармоишҳо'} · {range} рӯзи охир
          </h2>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {metric === 'revenue' ? formatPrice(stats.total) : stats.total}
            </span>
            {delta !== null && (
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-sm font-bold ${
                  delta >= 0 ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger'
                }`}
                title={`Нисбат ба ${range} рӯзи пеш аз он`}
              >
                {delta >= 0 ? <ArrowUpRight size={15} strokeWidth={2.5} /> : <ArrowDownRight size={15} strokeWidth={2.5} />}
                {Math.abs(delta * 100).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}%
                <span className="font-medium opacity-80">нисбат ба {range} рӯзи пеш</span>
              </span>
            )}
          </p>
          <p className="mt-1.5 text-sm text-muted">
            {stats.orders} фармоиш · {stats.active} рӯз бо фурӯш
            {stats.orders > 0 && <> · миёнаи фармоиш {formatPrice(stats.revenue / stats.orders)}</>}
          </p>
        </div>

        {/* Филтрҳо — дар як сатр */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-surface-2 p-1" role="group" aria-label="Нишондиҳанда">
            <button type="button" className={seg(metric === 'revenue')} aria-pressed={metric === 'revenue'} onClick={() => setMetric('revenue')}>
              Маблағ
            </button>
            <button type="button" className={seg(metric === 'orders')} aria-pressed={metric === 'orders'} onClick={() => setMetric('orders')}>
              Фармоиш
            </button>
          </div>
          <div className="flex rounded-xl bg-surface-2 p-1" role="group" aria-label="Давра">
            {RANGES.map((r) => (
              <button key={r} type="button" className={seg(range === r)} aria-pressed={range === r} onClick={() => { setRange(r); setHover(null) }}>
                {r} рӯз
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTable((v) => !v)}
            aria-pressed={table}
            title="Ҷадвал"
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${table ? 'bg-foreground text-background' : 'bg-surface-2 text-muted hover:text-foreground'}`}
          >
            <Table2 size={17} strokeWidth={2} />
          </button>
        </div>
      </div>

      {table ? (
        <div className="mt-4 max-h-[300px] overflow-y-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="px-3 py-2 font-semibold">Рӯз</th>
                <th className="px-3 py-2 text-right font-semibold">Фармоиш</th>
                <th className="px-3 py-2 text-right font-semibold">Маблағ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...days].reverse().map((d) => (
                <tr key={d.date} className={d.orders === 0 ? 'text-muted' : ''}>
                  <td className="px-3 py-2 tabular-nums">
                    {dayLabel(d.date)} <span className="text-muted">{WEEKDAYS[weekday(d.date)]}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{d.orders}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatPrice(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={wrap} className="relative mt-4 select-none" onMouseLeave={() => setHover(null)}>
          <svg width={width} height={TOP + PLOT_H + X_AXIS_H} className="block" role="img" aria-label={`Графики ${metric === 'revenue' ? 'фурӯш' : 'фармоишҳо'} дар ${range} рӯз`}>
            {/* Хатҳои ёрирасон ва меҳвари Y */}
            {plotTicks.map((t) => (
              <g key={t}>
                <line x1={AXIS_W} x2={width} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" strokeWidth="1" shapeRendering="crispEdges" />
                <text x={AXIS_W - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular-nums">
                  {metric === 'revenue' ? compact(t) : t}
                </text>
              </g>
            ))}

            {days.map((d, i) => {
              const v = value(d)
              const cx = AXIS_W + band * i + band / 2
              const h = v > 0 ? Math.max(2, (v / top) * PLOT_H) : 0
              const dim = hover !== null && hover !== i
              const isToday = i === days.length - 1
              // Сатри охир дар канори рост бурида нашавад
              const atEdge = cx + 24 > width
              // Санае, ки ба «Имрӯз» хеле наздик аст, пинҳон мешавад (дар телефон ба ҳам мечаспиданд)
              const todayX = Math.min(AXIS_W + band * (days.length - 0.5), width - 22)
              const showLabel = isToday || ((days.length - 1 - i) % labelEvery === 0 && Math.abs(todayX - cx) >= 50)
              return (
                <g key={d.date}>
                  {/* Минтақаи ҳассос — тамоми паҳнои рӯз */}
                  <rect
                    x={AXIS_W + band * i}
                    y={TOP}
                    width={band}
                    height={PLOT_H}
                    fill={hover === i ? 'var(--surface-2)' : 'transparent'}
                    onMouseEnter={() => setHover(i)}
                    onPointerDown={() => setHover(i)}
                  />
                  {h > 0 && (
                    <path
                      d={barPath(cx - barW / 2, y(v), barW, h)}
                      fill="var(--chart-bar)"
                      opacity={dim ? 0.35 : 1}
                      className="pointer-events-none transition-opacity duration-150"
                    />
                  )}
                  {/* Рақам танҳо болои рӯзи беҳтарин */}
                  {i === bestIndex && v > 0 && hover === null && (
                    <text x={cx} y={y(v) - 7} textAnchor="middle" className="pointer-events-none fill-foreground text-[11px] font-bold tabular-nums">
                      {metric === 'revenue' ? compact(v) : v}
                    </text>
                  )}
                  {showLabel && (
                    <text
                      x={atEdge ? width - 1 : cx}
                      y={TOP + PLOT_H + 17}
                      textAnchor={atEdge ? 'end' : 'middle'}
                      className={`pointer-events-none text-[11px] tabular-nums ${isToday ? 'fill-foreground font-semibold' : 'fill-muted'}`}
                    >
                      {isToday ? 'Имрӯз' : range === 7 ? `${WEEKDAYS[weekday(d.date)]} ${d.date.slice(8, 10)}` : dayLabel(d.date)}
                    </text>
                  )}
                </g>
              )
            })}
            {/* Хати асос */}
            <line x1={AXIS_W} x2={width} y1={TOP + PLOT_H} y2={TOP + PLOT_H} stroke="var(--border)" strokeWidth="1" shapeRendering="crispEdges" />
          </svg>

          {/* Тафсилоти рӯз (tooltip) */}
          {shown && hover !== null && (
            <div
              className="pointer-events-none absolute z-10 w-max min-w-[150px] -translate-x-1/2 rounded-xl border border-border bg-surface px-3 py-2 text-sm shadow-lg animate-fade-in"
              style={{
                left: Math.min(width - 80, Math.max(80, AXIS_W + band * hover + band / 2)),
                top: Math.max(0, y(value(shown)) - 78),
              }}
            >
              <p className="text-xs font-semibold text-muted">
                {WEEKDAYS_FULL[weekday(shown.date)]}, {dayLabel(shown.date)}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 font-bold tabular-nums">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--chart-bar)' }} />
                {formatPrice(shown.revenue)}
              </p>
              <p className="text-xs text-muted tabular-nums">
                {shown.orders} фармоиш{shown.orders > 0 && <> · миёна {formatPrice(shown.revenue / shown.orders)}</>}
              </p>
            </div>
          )}
          {stats.total === 0 && (
            <p className="absolute inset-x-0 top-[40%] text-center text-sm text-muted">Дар ин давра фурӯш нест</p>
          )}
        </div>
      )}
      {!table && stats.best && value(stats.best) > 0 && (
        <p className="mt-1 text-xs text-muted">
          Рӯзи беҳтарин: <b className="text-foreground">{dayLabel(stats.best.date)}</b> — {fmt(value(stats.best))}
        </p>
      )}
    </section>
  )
}
