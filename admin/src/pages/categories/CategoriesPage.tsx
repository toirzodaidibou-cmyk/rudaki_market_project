import { useCallback, useEffect, useMemo, useState } from 'react'
import { ImageIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from '../../components/icons'
import { Button, Modal, Spinner, Switch, useToast } from '../../components/ui'
import { api, ApiError, fileUrl } from '../../lib/api'
import type { Category, SaveCategoryRequest } from '../../lib/api'
import { CategoryForm } from './CategoryForm'

export function CategoriesPage() {
  const toast = useToast()
  const [items, setItems] = useState<Category[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Category | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const fetchList = useCallback(() => {
    api.categories.list().then(setItems, (e: unknown) => setLoadError(e instanceof Error ? e.message : 'Хато'))
  }, [])

  useEffect(fetchList, [fetchList])

  const retry = () => {
    setLoadError(null)
    fetchList()
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!items || !q) return items ?? []
    return items.filter(
      (c) => c.slug.includes(q) || Object.values(c.name).some((n) => n.toLowerCase().includes(q)),
    )
  }, [items, query])

  const nextSortOrder = useMemo(
    () => (items && items.length > 0 ? Math.max(...items.map((c) => c.sortOrder)) + 10 : 10),
    [items],
  )

  const upsert = (c: Category) =>
    setItems((list) => {
      const rest = (list ?? []).filter((x) => x.id !== c.id)
      return [...rest, c].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    })

  async function save(data: SaveCategoryRequest, icon: File | null) {
    const isNew = editing === null
    const saved = isNew ? await api.categories.create(data) : await api.categories.update(editing.id, data)
    upsert(saved)
    setFormOpen(false)
    if (icon) {
      try {
        upsert(await api.categories.uploadIcon(saved.id, icon))
      } catch (e) {
        // Категория захира шуд, вале икона не — корбар метавонад иконаро баъдтар аз нав бор кунад
        toast('error', `Категория захира шуд, аммо икона бор нашуд: ${e instanceof Error ? e.message : 'хато'}`)
        return
      }
    }
    toast('success', isNew ? `Категорияи «${saved.name.tg}» илова шуд` : 'Тағйирот захира шуд')
  }

  async function toggleActive(c: Category, isActive: boolean) {
    setTogglingId(c.id)
    try {
      upsert(await api.categories.update(c.id, { slug: c.slug, name: c.name, sortOrder: c.sortOrder, isActive }))
      toast('success', isActive ? `«${c.name.tg}» дар сайт нишон дода мешавад` : `«${c.name.tg}» аз сайт пинҳон шуд`)
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Хато')
    } finally {
      setTogglingId(null)
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await api.categories.remove(deleting.id)
      setItems((list) => (list ?? []).filter((x) => x.id !== deleting.id))
      toast('success', `«${deleting.name.tg}» нест карда шуд`)
      setDeleting(null)
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Хато')
    } finally {
      setDeleteBusy(false)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  return (
    <div className="animate-slide-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Категорияҳо</h1>
          <p className="mt-1 text-sm text-muted">
            {items ? `${items.length} категория · ${items.filter((c) => c.isActive).length} фаъол` : 'Бор шуда истодааст...'}
          </p>
        </div>
        <Button onClick={openCreate} className="h-11 px-5">
          <PlusIcon /> Илова кардан
        </Button>
      </div>

      <div className="relative mb-4">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
        <input
          className="field pl-10"
          placeholder="Ҷустуҷӯ аз рӯи ном ё slug..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        {loadError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <p className="font-medium text-danger">{loadError}</p>
            <Button variant="secondary" onClick={retry}>
              Аз нав кӯшиш кардан
            </Button>
          </div>
        ) : items === null ? (
          <div className="flex justify-center py-16 text-muted">
            <Spinner className="h-6 w-6" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-muted">
            {query ? 'Ҳеҷ чиз ёфт нашуд' : 'Ҳоло категория нест. Аввалинашро илова кунед!'}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((c) => (
              <li key={c.id} className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2/60 sm:px-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2">
                  {c.icon ? (
                    <img src={fileUrl(c.icon)!} alt="" className="h-9 w-9 object-contain" loading="lazy" />
                  ) : (
                    <ImageIcon className="text-muted" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className={`truncate font-semibold ${c.isActive ? '' : 'text-muted line-through decoration-1'}`}>
                    {c.name.tg}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {c.name.ru} · {c.name.en} · {c.name.uz}
                  </p>
                </div>

                <code className="hidden rounded-lg bg-surface-2 px-2 py-1 text-xs text-muted lg:block">/{c.slug}</code>
                <span className="hidden w-14 text-right text-xs text-muted tabular-nums sm:block" title="Тартиб">
                  #{c.sortOrder}
                </span>

                <Switch
                  checked={c.isActive}
                  disabled={togglingId === c.id}
                  onChange={(v) => toggleActive(c, v)}
                  label={c.isActive ? 'Фаъол (дар сайт)' : 'Ғайрифаъол (пинҳон)'}
                />

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(c)
                      setFormOpen(true)
                    }}
                    aria-label={`Тағйир додани «${c.name.tg}»`}
                    title="Тағйир додан"
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(c)}
                    aria-label={`Нест кардани «${c.name.tg}»`}
                    title="Нест кардан"
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CategoryForm
        key={formOpen ? (editing?.id ?? 'new') : 'closed'}
        open={formOpen}
        category={editing}
        defaultSortOrder={nextSortOrder}
        onClose={() => setFormOpen(false)}
        onSave={save}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Нест кардани категория"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Бекор кардан
            </Button>
            <Button variant="danger" loading={deleteBusy} onClick={confirmDelete}>
              Нест кардан
            </Button>
          </>
        }
      >
        <p>
          Категорияи <b>«{deleting?.name.tg}»</b> пурра нест карда шавад?
        </p>
        <p className="mt-2 text-sm text-muted">
          Ин амалро бекор кардан мумкин нест. Агар танҳо пинҳон кардан лозим бошад, тугмаи «фаъол»-ро хомӯш кунед.
        </p>
      </Modal>
    </div>
  )
}
