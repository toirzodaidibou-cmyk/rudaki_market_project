import { useEffect, useId, useRef, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, UploadIcon, XIcon } from '../../components/icons'
import { Button, Modal, Switch } from '../../components/ui'
import { api, ApiError, fileUrl } from '../../lib/api'
import type { Category, LocalizedNames, Product } from '../../lib/api'

const MAX_IMAGES = 8
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const emptyNames: LocalizedNames = { tg: '', ru: '', en: '', uz: '' }

const languages: { key: keyof LocalizedNames; label: string; placeholder: string }[] = [
  { key: 'tg', label: 'Тоҷикӣ', placeholder: 'Нектари «Добрый» малина, 1 л' },
  { key: 'ru', label: 'Русский', placeholder: 'Нектар «Добрый» малина, 1 л' },
  { key: 'en', label: 'English', placeholder: '"Dobry" raspberry nectar, 1 L' },
  { key: 'uz', label: 'Oʻzbekcha', placeholder: '«Dobry» malina nektari, 1 l' },
]

/** Сурат дар форма: аллакай дар сервер (existing) ё нав интихобшуда (new). */
type ImageItem =
  | { kind: 'existing'; key: string; id: number; src: string }
  | { kind: 'new'; key: string; file: File; src: string }

type Props = {
  open: boolean
  product: Product | null
  categories: Category[]
  defaultCategoryId: number | null
  onClose: () => void
  onSaved: (product: Product, isNew: boolean) => void
}

/** "12,50" / "12.5" → 12.5; холӣ ё нодуруст → NaN */
const parsePrice = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.').replace(/\s/g, '')))

const MAX_SIDE = 2000
const KEEP_AS_IS_BYTES = 2.5 * 1024 * 1024

/**
 * Акси камераи телефон (3–8 MB, баъзан HEIC) дар худи браузер то 2000px ва JPEG хурд карда мешавад —
 * бор кардан тез ва аз ҳадди 5 MB-и сервер намегузарад. Файлҳои хурди PNG/JPEG/WebP — бетағйир.
 */
async function prepareImage(file: File): Promise<File | null> {
  if (IMAGE_TYPES.includes(file.type) && file.size <= KEEP_AS_IS_BYTES) return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#fff' // PNG-и шаффоф → заминаи сафед
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    if (!blob) return null
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return null // браузер ин форматро намехонад
  }
}

export function ProductForm({ open, product, categories, defaultCategoryId, onClose, onSaved }: Props) {
  const formId = useId()
  // Форма ҳар бор аз нав сохта мешавад (key дар ProductsPage) — қиматҳои аввала аз product.
  // savedId: агар мол сохта шуда бошад, вале қадами баъдӣ (суратҳо) ноком шавад — такрор "update" мешавад, на "create".
  const [savedId, setSavedId] = useState<number | null>(product?.id ?? null)
  const [serverImageIds, setServerImageIds] = useState<number[]>(product?.images.map((i) => i.id) ?? [])
  const [categoryId, setCategoryId] = useState<number | ''>(product?.categoryId ?? defaultCategoryId ?? '')
  const [name, setName] = useState<LocalizedNames>(product?.name ?? emptyNames)
  const [description, setDescription] = useState<LocalizedNames>(product?.description ?? emptyNames)
  const [showDescription, setShowDescription] = useState(
    !!product && Object.values(product.description).some((d) => d.length > 0),
  )
  const [price, setPrice] = useState(product ? String(product.price).replace('.', ',') : '')
  const [oldPrice, setOldPrice] = useState(product?.oldPrice ? String(product.oldPrice).replace('.', ',') : '')
  const [sizeLabel, setSizeLabel] = useState(product?.sizeLabel ?? '')
  const [isNew, setIsNew] = useState(product?.isNew ?? false)
  const [isActive, setIsActive] = useState(product?.isActive ?? true)
  const [temporaryPhoto, setTemporaryPhoto] = useState(product?.temporaryPhoto ?? false)
  const [preparing, setPreparing] = useState(false)
  const [images, setImages] = useState<ImageItem[]>(
    product?.images.map((i) => ({ kind: 'existing', key: `e${i.id}`, id: i.id, src: fileUrl(i.thumb)! })) ?? [],
  )
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)

  // Озод кардани URL-ҳои муваққатии preview ҳангоми бастани форма
  const imagesRef = useRef(images)
  useEffect(() => {
    imagesRef.current = images
  })
  useEffect(
    () => () => imagesRef.current.forEach((i) => i.src.startsWith('blob:') && URL.revokeObjectURL(i.src)),
    [],
  )

  /** fromCamera — акси худӣ: нишонаи «сурати муваққатӣ» худкор хориҷ мешавад. */
  async function addFiles(files: FileList | File[], fromCamera = false) {
    const list = Array.from(files)
    const problems: string[] = []
    const accepted: ImageItem[] = []
    setPreparing(true)
    try {
      for (const original of list) {
        if (images.length + accepted.length >= MAX_IMAGES) {
          problems.push(`Ҳадди аксар ${MAX_IMAGES} сурат.`)
          break
        }
        const file = await prepareImage(original)
        if (!file) problems.push(`«${original.name}»: ин сурат хонда нашуд (PNG, JPEG ё WebP фиристед).`)
        else if (file.size > MAX_IMAGE_BYTES) problems.push(`«${original.name}»: андоза бояд то 5 MB бошад.`)
        else accepted.push({ kind: 'new', key: `n${crypto.randomUUID()}`, file, src: URL.createObjectURL(file) })
      }
    } finally {
      setPreparing(false)
    }
    setImages((imgs) => [...imgs, ...accepted])
    if (fromCamera && accepted.length > 0) setTemporaryPhoto(false)
    setErrors(({ images: _old, ...rest }) => (problems.length ? { ...rest, images: problems } : rest))
  }

  function removeImage(key: string) {
    setImages((imgs) => {
      const img = imgs.find((i) => i.key === key)
      if (img?.kind === 'new') URL.revokeObjectURL(img.src)
      return imgs.filter((i) => i.key !== key)
    })
  }

  function moveImage(index: number, delta: -1 | 1) {
    setImages((imgs) => {
      const next = [...imgs]
      const target = index + delta
      if (target < 0 || target >= next.length) return imgs
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const clientErrors: Record<string, string[]> = {}
    const priceValue = parsePrice(price)
    const oldPriceValue = oldPrice.trim() === '' ? null : parsePrice(oldPrice)
    if (categoryId === '') clientErrors.categoryId = ['Категорияро интихоб кунед.']
    if (!(priceValue > 0)) clientErrors.price = ['Нархро нависед (масалан: 23,60).']
    if (oldPriceValue !== null && !(oldPriceValue > priceValue))
      clientErrors.oldPrice = ['Нархи пешина бояд аз нархи ҷорӣ калонтар бошад.']
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setSaving(true)
    setErrors({})
    const isNewProduct = product === null && savedId === null
    try {
      const data = {
        categoryId: categoryId as number,
        name,
        description,
        price: priceValue,
        oldPrice: oldPriceValue,
        sizeLabel: sizeLabel.trim() || null,
        isNew,
        isActive,
        temporaryPhoto,
      }
      // 1. Маълумоти мол
      let saved = savedId === null ? await api.products.create(data) : await api.products.update(savedId, data)
      setSavedId(saved.id)

      // 2. Суратҳои нестшуда
      const keptIds = new Set(images.flatMap((i) => (i.kind === 'existing' ? [i.id] : [])))
      for (const id of serverImageIds.filter((id) => !keptIds.has(id))) {
        saved = await api.products.deleteImage(saved.id, id)
      }
      setServerImageIds(saved.images.map((i) => i.id))

      // 3. Суратҳои нав (ба охир илова мешаванд, бо ҳамон тартиб)
      const newItems = images.filter((i): i is Extract<ImageItem, { kind: 'new' }> => i.kind === 'new')
      let finalImages = images
      if (newItems.length > 0) {
        const before = new Set(saved.images.map((i) => i.id))
        saved = await api.products.uploadImages(saved.id, newItems.map((i) => i.file))
        const added = saved.images.filter((i) => !before.has(i.id))
        const idByKey = new Map(newItems.map((item, idx) => [item.key, added[idx]?.id]))
        finalImages = images.map((i) =>
          i.kind === 'new' ? { kind: 'existing', key: `e${idByKey.get(i.key)}`, id: idByKey.get(i.key)!, src: i.src } : i,
        )
        setImages(finalImages)
        setServerImageIds(saved.images.map((i) => i.id))
      }

      // 4. Тартиби суратҳо (агар аз тартиби сервер фарқ кунад)
      const wanted = finalImages.map((i) => (i.kind === 'existing' ? i.id : -1))
      if (wanted.join() !== saved.images.map((i) => i.id).join()) {
        saved = await api.products.reorderImages(saved.id, wanted)
      }

      onSaved(saved, isNewProduct)
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
      title={product ? 'Тағйири мол' : 'Моли нав'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Бекор кардан
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {product || savedId ? 'Захира кардан' : 'Илова кардан'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="space-y-6" noValidate>
        {err('_') && <p className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger">{err('_')}</p>}

        <ImageManager
          images={images}
          onAdd={(files) => void addFiles(files)}
          onCamera={(files) => void addFiles(files, true)}
          onRemove={removeImage}
          onMove={moveImage}
          preparing={preparing}
          errors={errors.images}
        />
        {temporaryPhoto && (
          <div className="-mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#f59e0b]/12 px-4 py-3 text-sm">
            <span>
              <b>📷 Сурати муваққатӣ</b> — аз манбаи бегона. Бо акси худӣ иваз кунед (тугмаи «Акс гирифтан»).
            </span>
            <button
              type="button"
              onClick={() => setTemporaryPhoto(false)}
              className="rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold hover:bg-surface-2"
            >
              Сурат худӣ аст
            </button>
          </div>
        )}

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Категория</span>
          <select
            className="field"
            value={categoryId}
            aria-invalid={!!err('categoryId')}
            onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="">— Интихоб кунед —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name.tg}
                {c.isActive ? '' : ' (пинҳон)'}
              </option>
            ))}
          </select>
          {err('categoryId') && <FieldError text={err('categoryId')!} />}
        </label>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Ном дар 4 забон</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {languages.map(({ key, label, placeholder }) => (
              <label key={key} className="block">
                <LangLabel code={key} label={label} />
                <input
                  className="field"
                  lang={key}
                  value={name[key]}
                  placeholder={placeholder}
                  maxLength={200}
                  aria-invalid={!!err(`name.${key}`)}
                  onChange={(e) => setName((n) => ({ ...n, [key]: e.target.value }))}
                />
                {err(`name.${key}`) && <FieldError text={err(`name.${key}`)!} />}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Нарх (с.)</span>
            <input
              className="field text-lg font-bold"
              inputMode="decimal"
              placeholder="23,60"
              value={price}
              aria-invalid={!!err('price')}
              onChange={(e) => setPrice(e.target.value)}
            />
            {err('price') && <FieldError text={err('price')!} />}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">
              Нархи пешина <span className="font-normal text-muted">(ихтиёрӣ)</span>
            </span>
            <input
              className="field"
              inputMode="decimal"
              placeholder="28,00"
              value={oldPrice}
              aria-invalid={!!err('oldPrice')}
              onChange={(e) => setOldPrice(e.target.value)}
            />
            {err('oldPrice') ? (
              <FieldError text={err('oldPrice')!} />
            ) : (
              <span className="mt-1 block text-xs text-muted">Барои нишон додани тахфиф</span>
            )}
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">
              Андоза <span className="font-normal text-muted">(ихтиёрӣ)</span>
            </span>
            <input
              className="field"
              placeholder="1 л, 500 г, 10 дона"
              maxLength={20}
              value={sizeLabel}
              aria-invalid={!!err('sizeLabel')}
              onChange={(e) => setSizeLabel(e.target.value)}
            />
            {err('sizeLabel') && <FieldError text={err('sizeLabel')!} />}
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleRow title="Нишонаи «Нав»" hint="Дар корт нишонаи бунафш" checked={isNew} onChange={setIsNew} />
          <ToggleRow title="Дар сайт нишон дода шавад" hint="Хомӯш — танҳо дар админ" checked={isActive} onChange={setIsActive} />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowDescription((v) => !v)}
            className="text-sm font-semibold text-[#9a6a00] hover:underline dark:text-accent"
          >
            {showDescription ? '− Пинҳон кардани тавсиф' : '+ Илова кардани тавсиф (ихтиёрӣ)'}
          </button>
          {showDescription && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {languages.map(({ key, label }) => (
                <label key={key} className="block">
                  <LangLabel code={key} label={label} />
                  <textarea
                    className="field min-h-24 resize-y"
                    lang={key}
                    maxLength={2000}
                    value={description[key]}
                    aria-invalid={!!err(`description.${key}`)}
                    onChange={(e) => setDescription((d) => ({ ...d, [key]: e.target.value }))}
                  />
                  {err(`description.${key}`) && <FieldError text={err(`description.${key}`)!} />}
                </label>
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}

function LangLabel({ code, label }: { code: string; label: string }) {
  return (
    <span className="mb-1 flex items-center gap-2 text-xs font-medium text-muted">
      <span className="rounded bg-surface-2 px-1.5 py-0.5 font-bold text-foreground uppercase">{code}</span>
      {label}
    </span>
  )
}

function FieldError({ text }: { text: string }) {
  return <span className="mt-1 block text-xs font-medium text-danger">{text}</span>
}

function ToggleRow({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4 py-3">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  )
}

function ImageManager({
  images,
  onAdd,
  onCamera,
  onRemove,
  onMove,
  preparing,
  errors,
}: {
  images: ImageItem[]
  onAdd: (files: FileList) => void
  onCamera: (files: FileList) => void
  onRemove: (key: string) => void
  onMove: (index: number, delta: -1 | 1) => void
  preparing: boolean
  errors?: string[]
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    onAdd(e.dataTransfer.files)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          Суратҳо <span className="font-normal text-muted">· {images.length}/{MAX_IMAGES} · аввалин — асосӣ</span>
        </span>
        {/* Дар телефон камераро мустақим мекушояд (дар компютер — интихоби файл) */}
        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={preparing}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-sm font-bold text-on-accent transition-transform active:scale-95 disabled:opacity-60"
          >
            📷 Акс гирифтан
          </button>
        )}
      </div>
      {preparing && <p className="mb-2 text-xs font-medium text-muted">Сурат омода мешавад…</p>}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((img, i) => (
          <div key={img.key} className="group relative aspect-square overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06] ring-inset dark:ring-white/10">
            <img src={img.src} alt="" className="h-full w-full object-contain p-2" />
            {i === 0 && (
              <span className="absolute top-1.5 left-1.5 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold text-on-accent">
                Асосӣ
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemove(img.key)}
              aria-label="Нест кардани сурат"
              className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/80 text-background opacity-90 transition-opacity hover:opacity-100"
            >
              <XIcon width={12} height={12} />
            </button>
            <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => onMove(i, -1)}
                aria-label="Ба чап"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-surface shadow disabled:invisible"
              >
                <ArrowLeftIcon width={14} height={14} />
              </button>
              <button
                type="button"
                disabled={i === images.length - 1}
                onClick={() => onMove(i, 1)}
                aria-label="Ба рост"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-surface shadow disabled:invisible"
              >
                <ArrowRightIcon width={14} height={14} />
              </button>
            </div>
          </div>
        ))}

        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed p-2 text-center text-xs transition-colors ${
              dragging ? 'border-accent bg-accent/10' : errors ? 'border-danger/60' : 'border-border hover:border-accent hover:bg-accent/5'
            }`}
          >
            <UploadIcon className="text-muted" />
            <span className="font-medium">Илова кардан</span>
            <span className="text-muted">ё ин ҷо кашед</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={`${IMAGE_TYPES.join(',')},image/heic,image/heif`}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onAdd(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onCamera(e.target.files)
          e.target.value = ''
        }}
      />
      {errors?.map((m) => <FieldError key={m} text={m} />)}
      <p className="mt-1.5 text-xs text-muted">
        Молро ба варақи сафед гузоред, дар рӯшноии рӯз — замина худкор тоза мешавад, мол дар марказ. PNG, JPEG, WebP; акси калон худкор хурд мешавад.
      </p>
    </div>
  )
}
