import { useEffect, useMemo, useRef, useState } from 'react'
import { ImageIcon, PencilIcon, PlusIcon, SearchIcon } from '../../components/icons'
import { Button, Spinner, Switch, useToast } from '../../components/ui'
import { api, ApiError, fileUrl, formatPrice, toListItem } from '../../lib/api'
import type { Category, PhotoFilter, Product, ProductListItem } from '../../lib/api'
import { PriceExcel } from './PriceExcel'
import { ProductForm } from './ProductForm'

const PAGE_SIZE = 24

export function ProductsPage() {
  const toast = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  // 📷 Сурати муваққатӣ — пурфурӯшҳо аввал (аввал онҳоро аксбардорӣ кунед)
  const [photo, setPhoto] = useState<PhotoFilter | null>(null)

  const [items, setItems] = useState<ProductListItem[] | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [openingId, setOpeningId] = useState<number | null>(null)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  useEffect(() => {
    api.categories.list().then(setCategories, () => {})
  }, [])

  // Ҷустуҷӯ баъд аз 300мс танаффус дар навиштан (на ҳар ҳарф — дархост)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])

  // Саҳифаи аввал ҳангоми ивази филтр. Дархости кӯҳна бекор мешавад (AbortController).
  const reloadKey = `${debounced}|${categoryId}|${photo}`
  const [retryCount, setRetryCount] = useState(0)
  useEffect(() => {
    const ctrl = new AbortController()
    api.products.list({ search: debounced, categoryId, photo, page: 1, pageSize: PAGE_SIZE }, ctrl.signal).then(
      (r) => {
        setItems(r.items)
        setTotal(r.total)
        setPage(1)
        setLoadError(null)
      },
      (e: unknown) => {
        if (!ctrl.signal.aborted) setLoadError(e instanceof Error ? e.message : 'Хато')
      },
    )
    return () => ctrl.abort()
  }, [debounced, categoryId, photo, retryCount])

  // Агар филтр ҳангоми "боз нишон додан" иваз шавад — натиҷаи кӯҳна илова намешавад
  const reloadKeyRef = useRef(reloadKey)
  useEffect(() => {
    reloadKeyRef.current = reloadKey
  })

  async function loadMore() {
    const key = reloadKey
    setLoadingMore(true)
    try {
      const r = await api.products.list({ search: debounced, categoryId, photo, page: page + 1, pageSize: PAGE_SIZE })
      if (reloadKeyRef.current !== key) return
      setItems((list) => [...(list ?? []), ...r.items.filter((x) => !(list ?? []).some((y) => y.id === x.id))])
      setTotal(r.total)
      setPage(r.page)
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Хато')
    } finally {
      setLoadingMore(false)
    }
  }

  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name.tg])), [categories])

  async function openEdit(id: number) {
    setOpeningId(id)
    try {
      setEditing(await api.products.get(id))
      setFormOpen(true)
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Хато')
    } finally {
      setOpeningId(null)
    }
  }

  function onSaved(product: Product, isNew: boolean) {
    const item = toListItem(product)
    setItems((list) => {
      const rest = (list ?? []).filter((x) => x.id !== item.id)
      return isNew ? [item, ...rest] : (list ?? []).map((x) => (x.id === item.id ? item : x))
    })
    if (isNew) setTotal((t) => t + 1)
    setFormOpen(false)
    toast('success', isNew ? `«${product.name.tg}» илова шуд` : 'Тағйирот захира шуд')
  }

  async function toggleActive(item: ProductListItem, isActive: boolean) {
    setTogglingId(item.id)
    try {
      const full = await api.products.get(item.id)
      const saved = await api.products.update(item.id, {
        categoryId: full.categoryId,
        name: full.name,
        description: full.description,
        price: full.price,
        oldPrice: full.oldPrice,
        sizeLabel: full.sizeLabel,
        isNew: full.isNew,
        isActive,
      })
      setItems((list) => (list ?? []).map((x) => (x.id === item.id ? toListItem(saved) : x)))
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Хато')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="animate-slide-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Молҳо</h1>
          <p className="mt-1 text-sm text-muted">{items ? `${total.toLocaleString('ru-RU')} мол` : 'Бор шуда истодааст...'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Нархҳо бо Excel: категорияи интихобшуда ё ҳама */}
          <PriceExcel categoryId={categoryId} onApplied={() => setRetryCount((n) => n + 1)} />
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            className="h-11 px-5"
          >
            <PlusIcon /> Илова кардан
          </Button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_260px]">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <input
            className="field pl-10"
            placeholder="Ҷустуҷӯ аз рӯи ном..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="field"
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value === '' ? null : Number(e.target.value))}
        >
          <option value="">Ҳамаи категорияҳо</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name.tg}
            </option>
          ))}
        </select>
      </div>

      {/* Филтри суратҳо: «📷 Сурати муваққатӣ» — пурфурӯшҳо аввал */}
      <div className="-mt-2 mb-5 flex flex-wrap items-center gap-2">
        {([
          [null, 'Ҳама'],
          ['temporary', '📷 Сурати муваққатӣ'],
          ['none', 'Бе сурат'],
        ] as const).map(([value, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => setPhoto(value)}
            aria-pressed={photo === value}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              photo === value ? 'bg-foreground text-background' : 'bg-surface-2 text-muted hover:text-foreground'
            }`}
          >
            {label}
            {photo === value && items ? ` · ${total.toLocaleString('ru-RU')}` : ''}
          </button>
        ))}
        {photo === 'temporary' && (
          <span className="text-xs text-muted">Пурфурӯшҳо аввал — аввал онҳоро аксбардорӣ кунед (📷 дар формаи мол).</span>
        )}
      </div>

      {loadError ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-surface px-6 py-16 text-center">
          <p className="font-medium text-danger">{loadError}</p>
          <Button variant="secondary" onClick={() => setRetryCount((n) => n + 1)}>
            Аз нав кӯшиш кардан
          </Button>
        </div>
      ) : items === null ? (
        <div className="flex justify-center py-16 text-muted">
          <Spinner className="h-6 w-6" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border px-6 py-16 text-center text-muted">
          {debounced || categoryId ? 'Ҳеҷ чиз ёфт нашуд' : 'Ҳоло мол нест. Аввалинашро илова кунед!'}
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((p) => (
              <li
                key={p.id}
                className={`group flex flex-col rounded-3xl border border-border bg-surface p-2.5 transition-shadow hover:shadow-lg ${p.isActive ? '' : 'opacity-60'}`}
              >
                <button
                  type="button"
                  onClick={() => openEdit(p.id)}
                  className="relative mb-2.5 aspect-square overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06] ring-inset dark:ring-white/10"
                  aria-label={`Тағйир додани «${p.name.tg}»`}
                >
                  {p.thumb ? (
                    <img src={fileUrl(p.thumb)!} alt="" loading="lazy" className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <ImageIcon width={32} height={32} className="m-auto text-muted" />
                  )}
                  {p.sizeLabel && (
                    <span className="absolute top-2 left-2 rounded-lg bg-foreground px-2 py-0.5 text-xs font-bold text-background">
                      {p.sizeLabel}
                    </span>
                  )}
                  {p.isNew && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-[#8b3dff] px-2.5 py-0.5 text-xs font-semibold text-white">
                      Нав
                    </span>
                  )}
                  {!p.isActive && (
                    <span className="absolute top-2 right-2 rounded-lg bg-surface px-2 py-0.5 text-xs font-semibold text-muted shadow">
                      Пинҳон
                    </span>
                  )}
                  {p.temporaryPhoto && (
                    <span
                      title="Сурати муваққатӣ — бо акси худӣ иваз кунед"
                      className="absolute right-2 bottom-2 rounded-lg bg-[#f59e0b] px-1.5 py-0.5 text-[11px] font-bold text-white shadow"
                    >
                      📷 муваққатӣ
                    </span>
                  )}
                  {openingId === p.id && (
                    <span className="absolute inset-0 flex items-center justify-center bg-surface/60">
                      <Spinner className="h-6 w-6" />
                    </span>
                  )}
                </button>

                <div className="flex items-baseline gap-2 px-1">
                  <span className="text-[17px] font-extrabold">{formatPrice(p.price)}</span>
                  {p.oldPrice && <span className="text-xs text-muted line-through">{formatPrice(p.oldPrice)}</span>}
                </div>
                <p className="mt-0.5 line-clamp-2 min-h-10 px-1 text-sm leading-5">{p.name.tg}</p>
                <p className="mt-1 truncate px-1 text-xs text-muted">{categoryName.get(p.categoryId) ?? '—'}</p>

                <div className="mt-2.5 flex items-center justify-between border-t border-border px-1 pt-2.5">
                  <Switch
                    checked={p.isActive}
                    disabled={togglingId === p.id}
                    onChange={(v) => toggleActive(p, v)}
                    label={p.isActive ? 'Дар сайт' : 'Пинҳон'}
                  />
                  {/* Нест кардан нест — мол танҳо пинҳон мешавад (тугмаи «Дар сайт»), то маълумот гум нашавад */}
                  <button
                    type="button"
                    onClick={() => openEdit(p.id)}
                    aria-label="Тағйир додан"
                    title="Тағйир додан"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground"
                  >
                    <PencilIcon width={16} height={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {items.length < total && (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" loading={loadingMore} onClick={loadMore} className="px-6">
                Боз нишон додан ({(total - items.length).toLocaleString('ru-RU')})
              </Button>
            </div>
          )}
        </>
      )}

      {formOpen && (
        <ProductForm
          key={editing?.id ?? 'new'}
          open
          product={editing}
          categories={categories}
          defaultCategoryId={categoryId}
          onClose={() => setFormOpen(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
