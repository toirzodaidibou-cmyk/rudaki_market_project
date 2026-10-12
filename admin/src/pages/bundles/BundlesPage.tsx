import { useEffect, useState } from 'react'
import { ImageIcon, PencilIcon, PlusIcon, SearchIcon, XIcon } from '../../components/icons'
import { Button, Modal, Spinner, Switch, useToast } from '../../components/ui'
import { ApiError, api, fileUrl, formatPrice } from '../../lib/api'
import type { Bundle, LocalizedNames, ProductListItem } from '../../lib/api'

const LANGS = [
  { key: 'tg', label: 'Тоҷикӣ' },
  { key: 'ru', label: 'Русӣ' },
  { key: 'en', label: 'Англисӣ' },
  { key: 'uz', label: 'Ӯзбекӣ' },
] as const

const EMOJIS = ['🍵', '☕', '🍿', '🍼', '🍚', '🥘', '🎉', '🌙', '🧺', '🍰', '🥗', '🧃']

type Line = { productId: number; name: string; sizeLabel: string | null; price: number; thumb: string | null; isActive: boolean; quantity: number }

const empty: LocalizedNames = { tg: '', ru: '', en: '', uz: '' }

/** Маҷмӯаҳо ("Дастархони чой", "Ош барои 10 нафар"): мизоҷ бо як тугма ҳамаашро ба сабад мегузорад. */
export function BundlesPage() {
  const toast = useToast()
  const [bundles, setBundles] = useState<Bundle[] | null>(null)
  const [editing, setEditing] = useState<Bundle | 'new' | null>(null)
  const [reload, setReload] = useState(0)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  useEffect(() => {
    api.bundles
      .list()
      .then(setBundles)
      .catch(() => toast('error', 'Маҷмӯаҳо бор нашуданд'))
  }, [reload, toast])

  // Нест кардан нест — маҷмӯа танҳо аз сайт пинҳон мешавад, то маълумот гум нашавад
  async function toggleActive(b: Bundle, isActive: boolean) {
    setTogglingId(b.id)
    try {
      const saved = await api.bundles.update(b.id, {
        name: b.name,
        description: b.description,
        emoji: b.emoji,
        sortOrder: b.sortOrder,
        isActive,
        items: b.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      })
      setBundles((list) => (list ?? []).map((x) => (x.id === b.id ? saved : x)))
      toast('success', isActive ? `«${b.name.tg}» дар сайт нишон дода мешавад` : `«${b.name.tg}» аз сайт пинҳон шуд`)
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Хато')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Маҷмӯаҳо</h1>
          <p className="text-sm text-muted">Дар саҳифаи асосӣ: мизоҷ бо як тугма ҳамаи молҳоро ба сабад мегузорад.</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <PlusIcon /> Маҷмӯаи нав
        </Button>
      </div>

      {!bundles ? (
        <div className="flex justify-center py-16 text-muted">
          <Spinner className="h-6 w-6" />
        </div>
      ) : bundles.length === 0 ? (
        <p className="py-16 text-center text-muted">Ҳоло маҷмӯа нест.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {bundles.map((b) => (
            <li key={b.id} className={`rounded-2xl border border-border bg-surface p-4 ${b.isActive ? '' : 'opacity-60'}`}>
              <div className="flex items-start gap-3">
                <span className="text-4xl leading-none">{b.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{b.name.tg}</p>
                  <p className="text-sm text-muted">
                    {b.items.length} мол · {formatPrice(b.total)} {b.isActive ? '' : '· пинҳон'}
                  </p>
                </div>
                <Switch
                  checked={b.isActive}
                  disabled={togglingId === b.id}
                  onChange={(v) => toggleActive(b, v)}
                  label={b.isActive ? 'Дар сайт' : 'Пинҳон'}
                />
                <button type="button" onClick={() => setEditing(b)} aria-label="Тағйир" className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground">
                  <PencilIcon />
                </button>
              </div>
              <div className="mt-3 flex -space-x-2">
                {b.items.slice(0, 8).map((i) => (
                  <span key={i.productId} className="h-9 w-9 overflow-hidden rounded-full bg-white ring-2 ring-surface">
                    {i.thumb && <img src={fileUrl(i.thumb)!} alt="" className="h-full w-full object-contain p-0.5" />}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <BundleForm
          bundle={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            setReload((r) => r + 1)
          }}
        />
      )}
    </div>
  )
}

function BundleForm({ bundle, onClose, onSaved }: { bundle: Bundle | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast()
  const [name, setName] = useState<LocalizedNames>(bundle?.name ?? empty)
  const [description, setDescription] = useState<LocalizedNames>(bundle?.description ?? empty)
  const [emoji, setEmoji] = useState(bundle?.emoji ?? '🧺')
  const [sortOrder, setSortOrder] = useState(bundle?.sortOrder ?? 100)
  const [isActive, setIsActive] = useState(bundle?.isActive ?? true)
  const [lines, setLines] = useState<Line[]>(
    bundle?.items.map((i) => ({ ...i, name: i.name.tg })) ?? [],
  )
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<ProductListItem[]>([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  // Ҷустуҷӯи мол барои илова
  useEffect(() => {
    const term = search.trim()
    if (term.length < 2) return
    const ctrl = new AbortController()
    const id = window.setTimeout(() => {
      api.products
        .list({ search: term, pageSize: 8 }, ctrl.signal)
        .then((r) => setResults(r.items))
        .catch(() => {})
    }, 250)
    return () => {
      window.clearTimeout(id)
      ctrl.abort()
    }
  }, [search])

  function add(p: ProductListItem) {
    setLines((ls) =>
      ls.some((l) => l.productId === p.id)
        ? ls.map((l) => (l.productId === p.id ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l))
        : [...ls, { productId: p.id, name: p.name.tg, sizeLabel: p.sizeLabel, price: p.price, thumb: p.thumb, isActive: p.isActive, quantity: 1 }],
    )
    setSearch('')
    setResults([])
  }

  const total = lines.filter((l) => l.isActive).reduce((s, l) => s + l.price * l.quantity, 0)

  async function save() {
    setSaving(true)
    setErrors({})
    const data = { name, description, emoji, sortOrder, isActive, items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })) }
    try {
      if (bundle) await api.bundles.update(bundle.id, data)
      else await api.bundles.create(data)
      toast('success', 'Захира шуд')
      onSaved()
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fieldErrors)
        toast('error', Object.values(e.fieldErrors)[0]?.[0] ?? e.message)
      } else toast('error', 'Хато')
    } finally {
      setSaving(false)
    }
  }

  const input = 'h-10 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent'

  return (
    <Modal
      open
      onClose={onClose}
      title={bundle ? 'Тағйири маҷмӯа' : 'Маҷмӯаи нав'}
      size="lg"
      footer={
        <>
          <span className="mr-auto self-center text-sm font-bold tabular-nums">Ҳамагӣ: {formatPrice(total)}</span>
          <Button variant="secondary" onClick={onClose}>
            Бекор
          </Button>
          <Button onClick={save} loading={saving}>
            Захира
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-semibold">Аломат</p>
          <div className="flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`h-10 w-10 rounded-xl text-xl ${emoji === e ? 'bg-accent' : 'bg-surface-2 hover:bg-surface-hover'}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {LANGS.map((l) => (
            <label key={l.key} className="block text-sm">
              <span className="mb-1 block font-semibold">
                Ном ({l.label}){l.key === 'tg' && <span className="text-danger"> *</span>}
              </span>
              <input value={name[l.key]} onChange={(e) => setName({ ...name, [l.key]: e.target.value })} className={input} maxLength={120} />
              {errors[`name.${l.key}`] && <span className="text-xs text-danger">{errors[`name.${l.key}`][0]}</span>}
            </label>
          ))}
          {LANGS.map((l) => (
            <label key={`d-${l.key}`} className="block text-sm">
              <span className="mb-1 block font-semibold">Тавсиф ({l.label})</span>
              <input value={description[l.key]} onChange={(e) => setDescription({ ...description, [l.key]: e.target.value })} className={input} maxLength={300} />
            </label>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm font-semibold">
            Тартиб
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} className={`${input} w-24`} />
          </label>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Switch checked={isActive} onChange={setIsActive} label="Дар сайт намоён" />
            Дар сайт намоён
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">
            Молҳо {errors.items && <span className="font-normal text-danger">— {errors.items[0]}</span>}
          </p>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ҷустуҷӯи мол барои илова…" className={`${input} pl-10`} />
            {search.trim().length >= 2 && results.length > 0 && (
              <ul className="absolute inset-x-0 top-11 z-10 max-h-72 overflow-y-auto rounded-xl border border-border bg-surface shadow-xl">
                {results.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => add(p)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                        {p.thumb ? <img src={fileUrl(p.thumb)!} alt="" className="h-full w-full object-contain" /> : <ImageIcon className="text-muted" />}
                      </span>
                      <span className="line-clamp-2 flex-1">{p.name.tg}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{formatPrice(p.price)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ul className="mt-3 divide-y divide-border rounded-2xl border border-border">
            {lines.length === 0 && <li className="p-4 text-center text-sm text-muted">Мол илова кунед.</li>}
            {lines.map((l) => (
              <li key={l.productId} className={`flex items-center gap-3 p-2.5 ${l.isActive ? '' : 'opacity-50'}`}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-black/5">
                  {l.thumb ? <img src={fileUrl(l.thumb)!} alt="" className="h-full w-full object-contain p-0.5" /> : <ImageIcon className="text-muted" />}
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="line-clamp-2">{l.name}</span>
                  <span className="text-xs text-muted tabular-nums">
                    {formatPrice(l.price)}
                    {!l.isActive && ' · пинҳон'}
                  </span>
                </span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={l.quantity}
                  onChange={(e) =>
                    setLines((ls) => ls.map((x) => (x.productId === l.productId ? { ...x, quantity: Math.max(1, Math.min(99, Number(e.target.value) || 1)) } : x)))
                  }
                  aria-label="Миқдор"
                  className="h-9 w-16 rounded-lg border border-border bg-surface-2 px-2 text-center text-sm"
                />
                <button
                  type="button"
                  onClick={() => setLines((ls) => ls.filter((x) => x.productId !== l.productId))}
                  aria-label="Хориҷ кардан"
                  className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                >
                  <XIcon />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  )
}
