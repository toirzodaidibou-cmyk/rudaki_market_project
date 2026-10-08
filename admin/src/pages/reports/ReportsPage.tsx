import { useEffect, useState } from 'react'
import { ImageIcon } from '../../components/icons'
import { Spinner, useToast } from '../../components/ui'
import { api, fileUrl, formatPrice } from '../../lib/api'
import type { SalesReport, SalesSummary } from '../../lib/api'
import { PAYMENT } from '../orders/status'

/** Ҳисобот: фурӯши имрӯз / 7 / 30 рӯз, график, молҳои пурфурӯш, пардохт ва мизоҷон. */
export function ReportsPage() {
  const toast = useToast()
  const [report, setReport] = useState<SalesReport | null>(null)

  useEffect(() => {
    api
      .reports()
      .then(setReport)
      .catch(() => toast('error', 'Ҳисобот бор нашуд'))
  }, [toast])

  if (!report)
    return (
      <div className="flex justify-center py-20 text-muted">
        <Spinner className="h-6 w-6" />
      </div>
    )

  const maxQty = Math.max(1, ...report.topProducts.map((t) => t.quantity))
  const totalPay = Math.max(1, report.payments.reduce((s, p) => s + p.orders, 0))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Ҳисобот</h1>
        <p className="text-sm text-muted">Вақти Душанбе. Фармоишҳои «Бекор шуд» ҳисоб намешаванд.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard title="Имрӯз" s={report.today} accent />
        <SummaryCard title="7 рӯз" s={report.week} />
        <SummaryCard title="30 рӯз" s={report.month} />
      </div>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 font-bold">Фурӯш дар 30 рӯз</h2>
        <SalesChart daily={report.daily} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-3 font-bold">10 моли пурфурӯш (30 рӯз)</h2>
          {report.topProducts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Ҳоло фурӯш нест.</p>
          ) : (
            <ol className="space-y-2.5">
              {report.topProducts.map((t, i) => (
                <li key={`${t.productId}-${i}`} className="flex items-center gap-3">
                  <span className="w-5 text-right text-sm font-bold text-muted tabular-nums">{i + 1}</span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-black/5">
                    {t.image ? <img src={fileUrl(t.image)!} alt="" className="h-full w-full object-contain p-0.5" /> : <ImageIcon className="text-muted" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 text-sm font-medium">{t.name}</span>
                    <span className="mt-1 block h-1.5 rounded-full bg-surface-2">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${(t.quantity / maxQty) * 100}%` }} />
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm tabular-nums">
                    <b>{t.quantity}</b> адад
                    <span className="block text-xs text-muted">{formatPrice(t.revenue)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="mb-3 font-bold">Мизоҷон (30 рӯз)</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat value={report.customers.buyers} label="харидор" />
              <Stat value={report.customers.newBuyers} label="нав" />
              <Stat value={report.customers.repeatBuyers} label="такрорӣ" />
            </div>
            {report.cancelledInMonth > 0 && (
              <p className="mt-3 text-xs text-muted">Бекоршуда дар 30 рӯз: {report.cancelledInMonth}</p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="mb-3 font-bold">Тарзи пардохт (30 рӯз)</h2>
            {report.payments.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">—</p>
            ) : (
              <ul className="space-y-2">
                {report.payments.map((p) => (
                  <li key={p.method} className="text-sm">
                    <span className="flex justify-between">
                      <span className="font-medium">{PAYMENT[p.method] ?? p.method}</span>
                      <span className="text-muted tabular-nums">
                        {p.orders} · {formatPrice(p.revenue)}
                      </span>
                    </span>
                    <span className="mt-1 block h-1.5 rounded-full bg-surface-2">
                      <span className="block h-full rounded-full bg-foreground/70" style={{ width: `${(p.orders / totalPay) * 100}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ title, s, accent = false }: { title: string; s: SalesSummary; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${accent ? 'bg-accent text-on-accent' : 'border border-border bg-surface'}`}>
      <p className={`text-sm font-semibold ${accent ? '' : 'text-muted'}`}>{title}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums">{formatPrice(s.revenue)}</p>
      <p className={`mt-1 text-xs tabular-nums ${accent ? 'opacity-80' : 'text-muted'}`}>
        {s.orders} фармоиш · миёна {formatPrice(s.averageOrder)}
      </p>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

/** Сутунҳои фурӯши рӯзона (SVG, бе китобхона). Ангушт/муш — маблағи рӯз. */
function SalesChart({ daily }: { daily: SalesReport['daily'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...daily.map((d) => d.revenue))
  const w = 600
  const h = 160
  const bw = w / daily.length
  const shown = hover !== null ? daily[hover] : null
  const label = (date: string) => date.slice(8, 10) + '.' + date.slice(5, 7)

  return (
    <div>
      <p className="mb-2 h-5 text-sm tabular-nums">
        {shown ? (
          <>
            <b>{label(shown.date)}</b> · {formatPrice(shown.revenue)} · {shown.orders} фармоиш
          </>
        ) : (
          <span className="text-muted">Ба сутун ангушт ё мушро баред</span>
        )}
      </p>
      <svg viewBox={`0 0 ${w} ${h + 18}`} className="w-full" role="img" aria-label="Графики фурӯш">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" x2={w} y1={h - h * f} y2={h - h * f} stroke="currentColor" className="text-border" strokeDasharray="3 4" />
        ))}
        {daily.map((d, i) => {
          const bh = d.revenue > 0 ? Math.max(3, (d.revenue / max) * (h - 6)) : 0
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onTouchStart={() => setHover(i)}>
              <rect x={i * bw} y="0" width={bw} height={h} fill="transparent" />
              <rect
                x={i * bw + bw * 0.15}
                y={h - bh}
                width={bw * 0.7}
                height={bh}
                rx="3"
                className={hover === i ? 'fill-foreground' : 'fill-accent'}
              />
              {i % 5 === 4 || i === daily.length - 1 ? (
                <text
                  x={i === daily.length - 1 ? w : i * bw + bw / 2}
                  y={h + 14}
                  textAnchor={i === daily.length - 1 ? "end" : "middle"}
                  className="fill-muted text-[10px]"
                >
                  {label(d.date)}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
