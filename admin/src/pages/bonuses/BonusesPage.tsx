import { useEffect, useState } from 'react'
import { Crown, Hourglass, Search, ShoppingBag, Sparkles, Users, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeftIcon, ArrowRightIcon } from '../../components/icons'
import { Button, Spinner, useToast } from '../../components/ui'
import { api, formatPrice } from '../../lib/api'
import type { LoyaltyPage, LoyaltyRow, LoyaltySort } from '../../lib/api'
import { formatPhone, formatTime } from '../orders/status'

const SORTS: { key: LoyaltySort; label: string }[] = [
  { key: 'balance', label: 'Бонуси бештар' },
  { key: 'pending', label: 'Дар интизорӣ' },
  { key: 'purchases', label: 'Харидҳо' },
  { key: 'recent', label: 'Навтарин' },
]

// Ҳамон градиенти сабз, ки корти мизоҷ дар сайт дорад
const CARD_BG = 'linear-gradient(135deg, #3fd27f 0%, #19b25c 38%, #0b7f3d 100%)'

/** Рақам аз 0 то value дар ~0,9 с. (бе аниматсия — агар «камтар ҳаракат»). */
function useCountUp(value: number) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const id = requestAnimationFrame(() => setShown(value))
      return () => cancelAnimationFrame(id)
    }
    const start = performance.now()
    let id = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 900)
      setShown(value * (1 - Math.pow(1 - p, 3)))
      if (p < 1) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [value])
  return shown
}

function RLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="10" fill="#fff" />
      <path d="M11 23V9h6.2a4.6 4.6 0 0 1 1 9.1L22 23" fill="none" stroke="#11a24f" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21.5 6.5c3 .2 4.3 2 4.2 4.6-2.8-.1-4.3-1.8-4.2-4.6z" fill="#7ad94a" />
    </svg>
  )
}

/** Админ → «Бонусҳо»: ҳамаи бонусҳо дар кортҳои Рӯдакӣ ва бонуси ҳар мизоҷ. */
export function BonusesPage() {
  const toast = useToast()
  const [data, setData] = useState<LoyaltyPage | null>(null)
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const [sort, setSort] = useState<LoyaltySort>('balance')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // Ҷустуҷӯ — 300 мс баъд аз охирин ҳарф
  useEffect(() => {
    const id = window.setTimeout(() => {
      setTerm(search.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(id)
  }, [search])

  useEffect(() => {
    const ctrl = new AbortController()
    api
      .loyalty({ q: term, sort, page }, ctrl.signal)
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setLoading(false)
        toast('error', 'Бонусҳо бор нашуданд')
      })
    return () => ctrl.abort()
  }, [term, sort, page, toast])

  const s = data?.summary
  const outstanding = useCountUp(s?.outstanding ?? 0)
  const rows = data?.rows.items ?? []
  const maxBalance = Math.max(0.01, ...rows.map((r) => r.balance))
  const pages = data ? Math.max(1, Math.ceil(data.rows.total / data.rows.pageSize)) : 1
  const pct = s ? s.percent.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : '1'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Бонусҳо</h1>
        <p className="text-sm text-muted">Корти Рӯдакӣ · {pct}% аз ҳар харид, пас аз «Расонида шуд». Бекоршуда ҳисоб намешавад.</p>
      </div>

      {/* Корти калон: ҳамаи бонусҳо дар кортҳо */}
      <section
        className="relative isolate overflow-hidden rounded-[28px] p-5 text-white shadow-[0_24px_50px_-24px_rgba(9,90,45,0.7)] animate-pop-in sm:p-7"
        style={{ background: CARD_BG }}
      >
        <svg aria-hidden viewBox="0 0 800 300" preserveAspectRatio="none" className="absolute inset-0 -z-10 h-full w-full">
          <path d="M0 210 C 180 140, 340 280, 800 170 L800 300 L0 300 Z" fill="rgba(255,255,255,0.10)" />
          <path d="M520 0 C 450 90, 560 190, 800 220 L800 0 Z" fill="rgba(255,255,255,0.12)" />
          <circle cx="110" cy="40" r="140" fill="rgba(217,249,157,0.10)" />
        </svg>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold opacity-90">
              <RLogo className="h-7 w-7" /> Бонус дар кортҳои мизоҷон
            </p>
            <p className="mt-3 text-[clamp(36px,7vw,56px)] leading-none font-extrabold tracking-tight">
              {s ? formatPrice(outstanding) : <span className="inline-block h-12 w-56 animate-pulse rounded-xl bg-white/25" />}
            </p>
            <p className="mt-2 text-sm opacity-90">
              Мизоҷон метавонанд ин бонусро дар фармоиши навбатӣ сарф кунанд.
            </p>
          </div>
          <span className="rounded-full bg-white/18 px-3 py-1.5 text-sm font-bold backdrop-blur-sm">{pct}% бонус</span>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <HeroStat icon={Users} label="Бо бонус" value={s ? `${s.withBonus} / ${s.customers}` : '—'} hint="мизоҷ" />
          <HeroStat icon={Hourglass} label="Дар интизорӣ" value={s ? `+${formatPrice(s.pending)}` : '—'} hint="пас аз расонидан" />
          <HeroStat icon={Sparkles} label="Ҳамагӣ ҷамъ шуд" value={s ? formatPrice(s.earned) : '—'} />
          <HeroStat icon={Wallet} label="Сарф шуд" value={s ? formatPrice(s.spent) : '—'} />
        </div>
      </section>

      {/* Ҷустуҷӯ ва тартиб — дар як сатр */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            inputMode="tel"
            placeholder="Ҷустуҷӯ бо рақами телефон…"
            className="field h-11 pl-10"
          />
        </label>
        <div className="flex flex-wrap rounded-xl bg-surface-2 p-1" role="group" aria-label="Тартиб">
          {SORTS.map((o) => (
            <button
              key={o.key}
              type="button"
              aria-pressed={sort === o.key}
              onClick={() => {
                setSort(o.key)
                setPage(1)
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                sort === o.key ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16 text-muted">
          <Spinner className="h-6 w-6" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border px-6 py-16 text-center text-muted">
          {term ? 'Бо ин рақам мизоҷ ёфт нашуд.' : 'Ҳоло мизоҷ нест. Бонус пас аз аввалин фармоиши «Расонида шуд» пайдо мешавад.'}
        </div>
      ) : (
        <ul className={`grid gap-3 md:grid-cols-2 ${loading ? 'opacity-60' : ''}`}>
          {rows.map((r, i) => (
            <BonusRow key={r.customerId} row={r} rank={sort === 'balance' && page === 1 && !term ? i + 1 : null} maxBalance={maxBalance} index={i} />
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ArrowLeftIcon />
          </Button>
          <span className="text-sm text-muted tabular-nums">
            {page} / {pages}
          </span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            <ArrowRightIcon />
          </Button>
        </div>
      )}
    </div>
  )
}

function HeroStat({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-white/14 p-3 backdrop-blur-sm ring-1 ring-white/15">
      <p className="flex items-center gap-1.5 text-xs font-semibold opacity-90">
        <Icon size={14} strokeWidth={2.4} /> {label}
      </p>
      <p className="mt-1 text-lg font-extrabold tracking-tight">{value}</p>
      {hint && <p className="text-[11px] opacity-75">{hint}</p>}
    </div>
  )
}

const MEDALS = ['#f5b301', '#a7b0ba', '#cd7f32']

function BonusRow({ row, rank, maxBalance, index }: { row: LoyaltyRow; rank: number | null; maxBalance: number; index: number }) {
  const share = row.balance / maxBalance
  return (
    <li
      className="group rounded-2xl border border-border bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-22px_rgba(0,0,0,0.35)] animate-slide-in"
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms`, animationFillMode: 'backwards' }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Корти хурд */}
        <div
          className="relative flex h-12 w-[76px] shrink-0 flex-col justify-between overflow-hidden rounded-xl p-1.5 text-white shadow-sm"
          style={{ background: CARD_BG }}
          aria-hidden
        >
          <RLogo className="h-4 w-4" />
          <span className="text-[8.5px] font-bold tracking-wider tabular-nums opacity-90">{row.cardNumber.replace('RM ', '')}</span>
          {rank !== null && rank <= 3 && row.balance > 0 && (
            <Crown size={16} strokeWidth={2.4} className="absolute top-1 right-1" style={{ color: MEDALS[rank - 1] }} fill={MEDALS[rank - 1]} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Рақам ҳеҷ гоҳ бурида намешавад; дар экрани танг бонус ба сатри поён мегузарад */}
          <p className="font-bold whitespace-nowrap tabular-nums">{formatPhone(row.phone)}</p>
          <p className="text-xs text-muted tabular-nums">
            {row.cardNumber} · аз {formatTime(row.registeredAt).split(',')[0]}
          </p>
        </div>

        <div className="shrink-0 text-right max-[440px]:basis-full max-[440px]:text-left">
          <p className={`text-xl font-extrabold tracking-tight tabular-nums ${row.balance > 0 ? 'text-success' : 'text-muted'}`}>
            {formatPrice(row.balance)}
          </p>
          {row.pending > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
              <Hourglass size={11} strokeWidth={2.6} /> +{formatPrice(row.pending)}
            </span>
          )}
        </div>
      </div>

      {/* Ҳиссаи бонус нисбат ба калонтарин дар саҳифа */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(row.balance > 0 ? 3 : 0, share * 100)}%`, background: CARD_BG }}
        />
      </div>

      <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <ShoppingBag size={13} strokeWidth={2.2} /> {row.purchases} харид
        </span>
        <span>Ҷамъ шуд: {formatPrice(row.earned)}</span>
        <span>Сарф шуд: {formatPrice(row.spent)}</span>
        {row.lastOrderAt && <span>Охирин фармоиш: {formatTime(row.lastOrderAt)}</span>}
      </p>
    </li>
  )
}
