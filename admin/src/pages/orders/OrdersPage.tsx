import { useEffect, useState } from 'react'
import { Clock, MapPin, MessageCircle, Phone } from 'lucide-react'
import { siWhatsapp } from 'simple-icons'
import { ArrowLeftIcon, ArrowRightIcon, ImageIcon, SearchIcon } from '../../components/icons'
import { Button, Modal, Spinner, useToast } from '../../components/ui'
import { ApiError, ORDER_STATUSES, api, fileUrl, formatPrice } from '../../lib/api'
import type { Order, OrderListItem, OrderStatus, Paged } from '../../lib/api'
import { useOrderWatch } from './OrderWatch'
import { PaymentMethod } from './PaymentMethod'
import { STATUS, deliveryText, formatPhone, formatTime, mapLink } from './status'

/** Фармоишҳо: ҷадвалҳо аз рӯи ҳолат, ҷустуҷӯ (рақам/телефон/суроға), тафсилот ва иваз кардани ҳолат. */
export function OrdersPage() {
  const { counts, refresh, version } = useOrderWatch()
  const [status, setStatus] = useState<OrderStatus | null>('new')
  const [search, setSearch] = useState('')
  const [term, setTerm] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paged<OrderListItem> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openNumber, setOpenNumber] = useState<number | null>(null)
  const [reload, setReload] = useState(0)

  // Ҷустуҷӯ 300мс пас аз навиштан
  useEffect(() => {
    const id = window.setTimeout(() => {
      setTerm(search.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(id)
  }, [search])

  useEffect(() => {
    const ctrl = new AbortController()
    api.orders
      .list({ status: term ? null : status, q: term, page }, ctrl.signal)
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((e) => {
        if (!(e instanceof DOMException)) setError(e instanceof ApiError ? e.message : 'Хато')
      })
    return () => ctrl.abort()
  }, [status, term, page, version, reload])

  const tabs: { key: OrderStatus | null; label: string }[] = [
    ...ORDER_STATUSES.map((s) => ({ key: s, label: STATUS[s].label })),
    { key: null, label: 'Ҳама' },
  ]
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Фармоишҳо</h1>
          <p className="text-sm text-muted">Ҳар 20 сония худкор нав мешавад. Фармоиши нав — бо овоз.</p>
        </div>
        <label className="relative w-full sm:w-72">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Рақам, телефон ё суроға"
            className="h-10 w-full rounded-xl border border-border bg-surface pr-3 pl-10 text-sm outline-none focus:border-accent"
          />
        </label>
      </div>

      {!term && (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {tabs.map((t) => {
            const n = t.key ? counts?.[t.key] : undefined
            const active = status === t.key
            return (
              <button
                key={t.key ?? 'all'}
                type="button"
                onClick={() => {
                  setStatus(t.key)
                  setPage(1)
                }}
                className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
                  active ? 'bg-foreground text-background' : 'bg-surface-2 text-foreground hover:bg-surface-hover'
                }`}
              >
                {t.label}
                {n !== undefined && n > 0 && (
                  <span
                    className={`min-w-5 rounded-full px-1.5 text-xs leading-5 ${
                      t.key === 'new' ? 'bg-danger text-white' : active ? 'bg-background/20' : 'bg-background text-muted'
                    }`}
                  >
                    {n}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {error && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      {!data && !error && (
        <div className="flex justify-center py-16 text-muted">
          <Spinner className="h-6 w-6" />
        </div>
      )}
      {data && data.items.length === 0 && <p className="py-16 text-center text-muted">Фармоиш нест.</p>}

      {data && data.items.length > 0 && (
        <ul className="space-y-2">
          {data.items.map((o) => (
            <li key={o.number}>
              <button
                type="button"
                onClick={() => setOpenNumber(o.number)}
                className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-border bg-surface p-4 text-left transition-shadow hover:shadow-md"
              >
                <span className="text-lg font-extrabold tabular-nums">№{o.number}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS[o.status].badge}`}>
                  {STATUS[o.status].label}
                </span>
                <span className="text-sm text-muted">{formatTime(o.createdAt)}</span>
                <span className="ml-auto text-lg font-bold tabular-nums">{formatPrice(o.total)}</span>
                <span className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={15} strokeWidth={2.2} className="text-muted" />
                    {deliveryText(o.deliveryFrom, o.deliveryTo)}
                  </span>
                  <PaymentMethod method={o.paymentMethod} size={20} />
                </span>
                <span className="w-full truncate text-sm">
                  <span className="font-semibold tabular-nums">{formatPhone(o.phone)}</span>
                  <span className="text-muted"> · {o.itemCount} адад · {o.address}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
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

      <OrderModal
        number={openNumber}
        onClose={() => setOpenNumber(null)}
        onChanged={() => {
          refresh()
          setReload((r) => r + 1)
        }}
      />
    </div>
  )
}

function OrderModal({ number, onClose, onChanged }: { number: number | null; onClose: () => void; onChanged: () => void }) {
  const toast = useToast()
  const [order, setOrder] = useState<Order | null>(null)
  const [busy, setBusy] = useState<OrderStatus | null>(null)

  useEffect(() => {
    if (number === null) return
    let alive = true
    api.orders
      .get(number)
      .then((o) => alive && setOrder(o))
      .catch(() => alive && toast('error', 'Фармоиш бор нашуд'))
    return () => {
      alive = false
      setOrder(null)
    }
  }, [number, toast])

  async function change(next: OrderStatus) {
    if (!order) return
    if (next === 'cancelled' && !window.confirm(`Фармоиши №${order.number}-ро бекор мекунед?`)) return
    setBusy(next)
    try {
      setOrder(await api.orders.setStatus(order.number, next))
      toast('success', `№${order.number}: ${STATUS[next].label}`)
      onChanged()
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Хато')
    } finally {
      setBusy(null)
    }
  }

  const phoneDigits = order?.phone.replace(/\D/g, '') ?? ''
  const map = order ? mapLink(order.address) : null

  return (
    <Modal
      open={number !== null}
      onClose={onClose}
      title={number ? `Фармоиш №${number}` : ''}
      size="lg"
      footer={
        order && order.nextStatuses.length > 0 ? (
          <div className="flex w-full flex-wrap justify-end gap-2">
            {order.nextStatuses.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busy !== null}
                onClick={() => change(s)}
                className={`inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-60 ${
                  s === 'cancelled' ? 'bg-surface-2 text-danger hover:bg-danger/10' : STATUS[s].button
                }`}
              >
                {busy === s && <Spinner />}
                {STATUS[s].action}
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      {!order ? (
        <div className="flex justify-center py-12 text-muted">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${STATUS[order.status].badge}`}>
              {STATUS[order.status].label}
            </span>
            <span className="text-muted">
              {formatTime(order.createdAt)}
              {order.statusUpdatedAt && ` · ҳолат: ${formatTime(order.statusUpdatedAt)}`}
            </span>
          </div>

          <Steps status={order.status} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-xs text-muted">Мизоҷ</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{formatPhone(order.phone)}</p>
              <div className="mt-2 flex gap-2">
                <a href={`tel:+${phoneDigits}`} className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-surface-hover">
                  <Phone size={15} strokeWidth={2.2} /> Занг
                </a>
                <a
                  href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(`Салом! Фармоиши №${order.number} аз RUDAKI MARKET.`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-sm font-semibold text-white hover:brightness-95"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4 w-4">
                    <path d={siWhatsapp.path} />
                  </svg>
                  WhatsApp
                </a>
              </div>
            </div>
            <div className="rounded-2xl bg-surface-2 p-4">
              <p className="text-xs text-muted">Суроға</p>
              <p className="mt-1 font-semibold break-words">{order.address}</p>
              {map && (
                <a href={map} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-surface-hover">
                  <MapPin size={15} strokeWidth={2.2} /> Дар харита
                </a>
              )}
              {order.comment && (
                <p className="mt-2 flex items-start gap-1.5 text-sm text-muted">
                  <MessageCircle size={15} strokeWidth={2.2} className="mt-0.5 shrink-0" />
                  {order.comment}
                </p>
              )}
              <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold">
                <Clock size={15} strokeWidth={2.2} className="text-muted" />
                {deliveryText(order.deliveryFrom, order.deliveryTo)}
              </p>
              <p className="mt-1 text-sm font-semibold">
                <PaymentMethod method={order.paymentMethod} size={20} />
              </p>
            </div>
          </div>

          <ul className="divide-y divide-border rounded-2xl border border-border">
            {order.items.map((it, i) => (
              <li key={i} className="flex items-center gap-3 p-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
                  {it.image ? (
                    <img src={fileUrl(it.image)!} alt="" className="h-full w-full object-contain p-1" />
                  ) : (
                    <ImageIcon className="text-muted" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-medium">{it.name}</span>
                  <span className="text-xs text-muted tabular-nums">
                    {it.sizeLabel ? `${it.sizeLabel} · ` : ''}
                    {formatPrice(it.price)} × {it.quantity}
                  </span>
                </span>
                <span className="font-bold tabular-nums">{formatPrice(it.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted">
              <span>Молҳо</span>
              <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between gap-3 text-emerald-700 dark:text-emerald-400">
                <span>Тахфифи маҷмӯа{order.discountNote ? ` (${order.discountNote})` : ''}</span>
                <span className="shrink-0 tabular-nums">−{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted">
              <span>Расонидан</span>
              <span className="tabular-nums">{order.deliveryFee === 0 ? 'ройгон' : formatPrice(order.deliveryFee)}</span>
            </div>
            {order.bonusUsed > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                <span>Бо бонуси корти Рӯдакӣ</span>
                <span className="tabular-nums">−{formatPrice(order.bonusUsed)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 text-lg font-extrabold">
              <span>Ҳамагӣ</span>
              <span className="tabular-nums">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

/** Зинаҳо: Нав → Тасдиқ → Дар роҳ → Расонида (бекоршуда — алоҳида). */
function Steps({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') return null
  const steps: OrderStatus[] = ['new', 'confirmed', 'delivering', 'delivered']
  const current = steps.indexOf(status)
  return (
    <ol className="flex items-center gap-1">
      {steps.map((s, i) => (
        <li key={s} className="flex flex-1 flex-col gap-1.5">
          <span className={`h-1.5 rounded-full ${i <= current ? 'bg-accent' : 'bg-surface-2'}`} />
          <span className={`text-[11px] font-semibold ${i <= current ? 'text-foreground' : 'text-muted'}`}>{STATUS[s].label}</span>
        </li>
      ))}
    </ol>
  )
}
