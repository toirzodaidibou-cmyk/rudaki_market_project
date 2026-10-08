import { useEffect, useId, useRef, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { ImageIcon, UploadIcon, XIcon } from '../../components/icons'
import { Button, Modal, Switch } from '../../components/ui'
import { ApiError, fileUrl } from '../../lib/api'
import type { Category, LocalizedNames, SaveCategoryRequest } from '../../lib/api'

const MAX_ICON_BYTES = 1024 * 1024
const ICON_TYPES = ['image/png', 'image/jpeg', 'image/webp']

const languages: { key: keyof LocalizedNames; label: string; placeholder: string }[] = [
  { key: 'tg', label: 'Тоҷикӣ', placeholder: 'Қаҳва' },
  { key: 'ru', label: 'Русский', placeholder: 'Кофе' },
  { key: 'en', label: 'English', placeholder: 'Coffee' },
  { key: 'uz', label: 'Oʻzbekcha', placeholder: 'Qahva' },
]

/** "Ice Cream & Co" → "ice-cream-co" */
function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

type Props = {
  open: boolean
  /** null — категорияи нав */
  category: Category | null
  defaultSortOrder: number
  onClose: () => void
  /** Захира: бояд хато партояд (ApiError), агар нашавад */
  onSave: (data: SaveCategoryRequest, icon: File | null) => Promise<void>
}

export function CategoryForm({ open, category, defaultSortOrder, onClose, onSave }: Props) {
  const formId = useId()
  // Форма ҳар бор аз нав сохта мешавад (key дар CategoriesPage) — қиматҳои аввала аз category
  const [name, setName] = useState<LocalizedNames>(category?.name ?? { tg: '', ru: '', en: '', uz: '' })
  const [slug, setSlug] = useState(category?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(category !== null)
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? defaultSortOrder)
  const [isActive, setIsActive] = useState(category?.isActive ?? true)
  const [icon, setIcon] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(fileUrl(category?.icon ?? null))
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)

  // URL-и муваққатии preview-ро озод кардан
  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function setNameFor(key: keyof LocalizedNames, value: string) {
    setName((n) => ({ ...n, [key]: value }))
    // Slug худкор аз номи англисӣ, то вақте ки корбар онро дастӣ иваз накардааст
    if (key === 'en' && !slugTouched) setSlug(slugify(value))
  }

  function pickIcon(file: File | undefined) {
    if (!file) return
    if (!ICON_TYPES.includes(file.type)) {
      setErrors((e) => ({ ...e, icon: ['Танҳо PNG, JPEG ё WebP.'] }))
      return
    }
    if (file.size > MAX_ICON_BYTES) {
      setErrors((e) => ({ ...e, icon: ['Андоза бояд то 1 MB бошад.'] }))
      return
    }
    setErrors(({ icon: _removed, ...rest }) => rest)
    setIcon(file)
    setPreview(URL.createObjectURL(file))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      await onSave({ slug, name, sortOrder, isActive }, icon)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) setErrors(err.fieldErrors)
      else setErrors({ _: [err instanceof Error ? err.message : 'Хатои номаълум'] })
    } finally {
      setSaving(false)
    }
  }

  const err = (key: string) => errors[key]?.[0]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? 'Тағйири категория' : 'Категорияи нав'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Бекор кардан
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {category ? 'Захира кардан' : 'Илова кардан'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-5" noValidate>
        {err('_') && <p className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger">{err('_')}</p>}

        <IconDropzone
          preview={preview}
          canClear={icon !== null}
          onPick={pickIcon}
          onClear={() => {
            // Бекор кардани файли нав → бозгашт ба иконаи пешина
            setIcon(null)
            setPreview(fileUrl(category?.icon ?? null))
          }}
          error={err('icon')}
        />

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Ном дар 4 забон</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {languages.map(({ key, label, placeholder }) => (
              <label key={key} className="block">
                <span className="mb-1 flex items-center gap-2 text-xs font-medium text-muted">
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 font-bold text-foreground uppercase">{key}</span>
                  {label}
                </span>
                <input
                  className="field"
                  lang={key}
                  value={name[key]}
                  placeholder={placeholder}
                  maxLength={100}
                  aria-invalid={!!err(`name.${key}`)}
                  onChange={(e) => setNameFor(key, e.target.value)}
                />
                {err(`name.${key}`) && <FieldError text={err(`name.${key}`)!} />}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Slug (суроға дар сайт)</span>
            <div className="flex items-center rounded-xl">
              <span className="mr-2 text-sm whitespace-nowrap text-muted">/catalog/</span>
              <input
                className="field font-mono"
                value={slug}
                placeholder="coffee"
                maxLength={64}
                aria-invalid={!!err('slug')}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(e.target.value.toLowerCase())
                }}
              />
            </div>
            {err('slug') ? (
              <FieldError text={err('slug')!} />
            ) : (
              <span className="mt-1 block text-xs text-muted">Аз номи англисӣ худкор сохта мешавад</span>
            )}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Тартиб</span>
            <input
              className="field"
              type="number"
              min={0}
              max={100000}
              value={sortOrder}
              aria-invalid={!!err('sortOrder')}
              onChange={(e) => setSortOrder(Number(e.target.value))}
            />
            {err('sortOrder') && <FieldError text={err('sortOrder')!} />}
          </label>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Дар сайт нишон дода шавад</p>
            <p className="text-xs text-muted">Агар хомӯш бошад, категория танҳо дар админ дида мешавад</p>
          </div>
          <Switch checked={isActive} onChange={setIsActive} label="Фаъол" />
        </div>
      </form>
    </Modal>
  )
}

function FieldError({ text }: { text: string }) {
  return <span className="mt-1 block text-xs font-medium text-danger">{text}</span>
}

function IconDropzone({
  preview,
  canClear,
  onPick,
  onClear,
  error,
}: {
  preview: string | null
  canClear: boolean
  onPick: (file: File | undefined) => void
  onClear: () => void
  error?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    onPick(e.dataTransfer.files[0])
  }

  return (
    <div>
      <span className="mb-2 block text-sm font-semibold">Икона</span>
      <div className="flex items-center gap-4">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-surface-2">
          {preview ? (
            <>
              <img src={preview} alt="" className="h-16 w-16 object-contain" />
              {canClear && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Нест кардани икона"
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background shadow"
              >
                <XIcon width={12} height={12} />
              </button>
              )}
            </>
          ) : (
            <ImageIcon width={28} height={28} className="text-muted" />
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex h-24 flex-1 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed text-sm transition-colors ${
            dragging
              ? 'border-accent bg-accent/10'
              : error
                ? 'border-danger/60'
                : 'border-border hover:border-accent hover:bg-accent/5'
          }`}
        >
          <UploadIcon className="text-muted" />
          <span className="font-medium">Суратро ин ҷо кашед ё интихоб кунед</span>
          <span className="text-xs text-muted">PNG, JPEG, WebP · то 1 MB · беҳтар 96×96 ва шаффоф</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ICON_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            onPick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      {error && <FieldError text={error} />}
    </div>
  )
}
