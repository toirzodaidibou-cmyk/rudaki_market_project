import { useEffect, useRef, useState } from 'react'
import { ImageIcon, PencilIcon, PlusIcon, UploadIcon } from '../../components/icons'
import { Button, Modal, Spinner, Switch, useToast } from '../../components/ui'
import { ApiError, api, fileUrl } from '../../lib/api'
import type { Banner, Category, LocalizedNames, SaveBannerRequest } from '../../lib/api'

// Ҳамон рангҳо дар сайт (frontend/src/components/home/heroThemes.ts)
const THEMES: Record<string, { bg: string; light: boolean; label: string }> = {
  red: { bg: 'linear-gradient(115deg, #6e0710 0%, #c40f1b 48%, #ff4b4b 100%)', light: false, label: 'Сурх' },
  yellow: { bg: 'linear-gradient(115deg, #fff3cf 0%, #fdc95c 52%, #f3972a 100%)', light: true, label: 'Зард' },
  pink: { bg: 'linear-gradient(115deg, #44102f 0%, #962c5f 50%, #f18cb5 100%)', light: false, label: 'Гулобӣ' },
  blue: { bg: 'linear-gradient(115deg, #142a72 0%, #2563eb 50%, #6ccbff 100%)', light: false, label: 'Кабуд' },
  lavender: { bg: 'linear-gradient(115deg, #f2f7ff 0%, #dde6ff 50%, #fbd0e5 100%)', light: true, label: 'Нармранг' },
  green: { bg: 'linear-gradient(115deg, #0b3d2a 0%, #15803d 50%, #6ee7a8 100%)', light: false, label: 'Сабз' },
  orange: { bg: 'linear-gradient(115deg, #7a2e00 0%, #ea580c 50%, #ffb36b 100%)', light: false, label: 'Норинҷӣ' },
  dark: { bg: 'linear-gradient(115deg, #111111 0%, #2a2440 50%, #5b4b8a 100%)', light: false, label: 'Торик' },
}

const LANGS = [
  { key: 'tg', label: 'TJ' },
  { key: 'ru', label: 'RU' },
  { key: 'en', label: 'EN' },
  { key: 'uz', label: 'UZ' },
] as const

const empty: LocalizedNames = { tg: '', ru: '', en: '', uz: '' }

/** Пешнамоиши хурди слайд (ҳамон намуди сайт). */
function Preview({ theme, title, badge, image }: { theme: string; title: string; badge: string; image: string | null }) {
  const t = THEMES[theme] ?? THEMES.yellow
  return (
    <div className="relative h-32 overflow-hidden rounded-2xl" style={{ background: t.bg }}>
      {image && <img src={image} alt="" className="absolute right-0 bottom-0 h-[95%] w-[55%] object-contain object-bottom" />}
      <div className={`relative z-10 flex h-full max-w-[55%] flex-col justify-center gap-1 pl-4 ${t.light ? 'text-[#1d1a2b]' : 'text-white'}`}>
        {badge && <span className={`w-fit rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${t.light ? 'bg-black/5' : 'bg-white/15'}`}>{badge}</span>}
        <span className="text-base leading-tight font-extrabold">{title || 'Сарлавҳа'}</span>
      </div>
    </div>
  )
}

/** Слайдҳои саҳифаи асосӣ: илова, тағйир, сурат, ранг, пайванд, тартиб, пинҳон (нест кардан нест). */
export function BannersPage() {
  const toast = useToast()
  const [banners, setBanners] = useState<Banner[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState<Banner | 'new' | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    api.banners.list().then(setBanners).catch(() => toast('error', 'Баннерҳо бор нашуданд'))
  }, [reload, toast])
  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => {})
  }, [])

  const [togglingId, setTogglingId] = useState<number | null>(null)

  // Нест кардан нест — слайд танҳо аз сайт пинҳон мешавад
  async function toggleActive(b: Banner, isActive: boolean) {
    setTogglingId(b.id)
    try {
      const saved = await api.banners.update(b.id, {
        badge: b.badge,
        title: b.title,
        text: b.text,
        cta: b.cta,
        href: b.href,
        theme: b.theme,
        sortOrder: b.sortOrder,
        isActive,
      })
      setBanners((list) => (list ?? []).map((x) => (x.id === b.id ? saved : x)))
      toast('success', isActive ? 'Слайд дар сайт нишон дода мешавад' : 'Слайд аз сайт пинҳон шуд')
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
          <h1 className="text-2xl font-extrabold tracking-tight">Баннерҳо</h1>
          <p className="text-sm text-muted">Слайдҳои саҳифаи асосӣ. Тартиб — рақами хурд аввал.</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <PlusIcon /> Слайди нав
        </Button>
      </div>

      {!banners ? (
        <div className="flex justify-center py-16 text-muted">
          <Spinner className="h-6 w-6" />
        </div>
      ) : banners.length === 0 ? (
        <p className="py-16 text-center text-muted">Слайд нест — сайт слайдҳои пешфарзро нишон медиҳад.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {banners.map((b) => (
            <li key={b.id} className={`rounded-2xl border border-border bg-surface p-3 ${b.isActive ? '' : 'opacity-50'}`}>
              <Preview theme={b.theme} title={b.title.tg} badge={b.badge.tg} image={fileUrl(b.image)} />
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-muted tabular-nums">#{b.sortOrder}</span>
                <span className="min-w-0 flex-1 truncate text-muted">→ {b.href}</span>
                {!b.image && <span className="text-xs font-semibold text-danger">бе сурат</span>}
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
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <BannerForm
          banner={editing === 'new' ? null : editing}
          categories={categories}
          nextSort={(banners?.reduce((m, b) => Math.max(m, b.sortOrder), 0) ?? 0) + 10}
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

function BannerForm({
  banner,
  categories,
  nextSort,
  onClose,
  onSaved,
}: {
  banner: Banner | null
  categories: Category[]
  nextSort: number
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [lang, setLang] = useState<keyof LocalizedNames>('tg')
  const [data, setData] = useState<SaveBannerRequest>({
    badge: banner?.badge ?? empty,
    title: banner?.title ?? empty,
    text: banner?.text ?? empty,
    cta: banner?.cta ?? empty,
    href: banner?.href ?? '/catalog',
    theme: banner?.theme ?? 'yellow',
    sortOrder: banner?.sortOrder ?? nextSort,
    isActive: banner?.isActive ?? true,
  })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(fileUrl(banner?.image ?? null))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const setText = (field: 'badge' | 'title' | 'text' | 'cta', value: string) =>
    setData((d) => ({ ...d, [field]: { ...d[field], [lang]: value } }))

  function pick(f: File | undefined) {
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function save() {
    if (!banner && !file) {
      toast('error', 'Сурати молро интихоб кунед (PNG бе замина беҳтар аст)')
      return
    }
    setSaving(true)
    setErrors({})
    try {
      const saved = banner ? await api.banners.update(banner.id, data) : await api.banners.create(data)
      if (file) await api.banners.uploadImage(saved.id, file)
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
  const isCategory = data.href.startsWith('/catalog/')
  const err = (k: string) => errors[k]?.[0] && <span className="text-xs text-danger">{errors[k][0]}</span>

  return (
    <Modal
      open
      onClose={onClose}
      title={banner ? 'Тағйири слайд' : 'Слайди нав'}
      size="lg"
      footer={
        <>
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
        <Preview theme={data.theme} title={data.title[lang] || data.title.tg} badge={data.badge[lang] || data.badge.tg} image={preview} />

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>
            <UploadIcon /> {preview ? 'Иваз кардани сурат' : 'Сурати мол'}
          </Button>
          <input ref={fileInput} type="file" accept="image/png,image/webp,image/jpeg" hidden onChange={(e) => pick(e.target.files?.[0])} />
          <span className="flex items-center gap-1 text-xs text-muted">
            <ImageIcon width={14} height={14} /> PNG/WebP бе замина (шаффоф) беҳтарин аст, то 5 MB
          </span>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Ранг</p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {Object.entries(THEMES).map(([key, t]) => (
              <button
                key={key}
                type="button"
                onClick={() => setData((d) => ({ ...d, theme: key }))}
                title={t.label}
                aria-label={t.label}
                aria-pressed={data.theme === key}
                className={`h-10 rounded-xl ring-offset-2 ring-offset-surface ${data.theme === key ? 'ring-2 ring-foreground' : ''}`}
                style={{ background: t.bg }}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex gap-1">
            {LANGS.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => setLang(l.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold ${lang === l.key ? 'bg-foreground text-background' : 'bg-surface-2'}`}
              >
                {l.label}
              </button>
            ))}
            <span className="ml-2 self-center text-xs text-muted">Забонҳои холӣ — матни тоҷикӣ</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">
                Сарлавҳа{lang === 'tg' && <span className="text-danger"> *</span>}
              </span>
              <input value={data.title[lang]} onChange={(e) => setText('title', e.target.value)} className={input} maxLength={80} placeholder="Тароват дар ҳар қатра" />
              {err(`title.${lang}`)}
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Нишона (болои сарлавҳа)</span>
              <input value={data.badge[lang]} onChange={(e) => setText('badge', e.target.value)} className={input} maxLength={40} placeholder="Нӯшокиҳо" />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-semibold">Матн</span>
              <input value={data.text[lang]} onChange={(e) => setText('text', e.target.value)} className={input} maxLength={200} placeholder="Нӯшокиҳои дӯстдоштаи шумо дар як ҷо." />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Матни тугма</span>
              <input value={data.cta[lang]} onChange={(e) => setText('cta', e.target.value)} className={input} maxLength={30} placeholder="Харидан" />
            </label>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">Пайванд: категория</span>
            <select
              value={isCategory ? data.href : ''}
              onChange={(e) => setData((d) => ({ ...d, href: e.target.value || '/catalog' }))}
              className={input}
            >
              <option value="">— дигар (дар поён) —</option>
              {categories.map((c) => (
                <option key={c.id} value={`/catalog/${c.slug}`}>
                  {c.name.tg}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">ё роҳи сайт</span>
            <input value={data.href} onChange={(e) => setData((d) => ({ ...d, href: e.target.value }))} className={input} placeholder="/product/123" />
            {err('href')}
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm font-semibold">
            Тартиб
            <input
              type="number"
              value={data.sortOrder}
              onChange={(e) => setData((d) => ({ ...d, sortOrder: Number(e.target.value) || 0 }))}
              className={`${input} w-24`}
            />
          </label>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Switch checked={data.isActive} onChange={(v) => setData((d) => ({ ...d, isActive: v }))} label="Дар сайт намоён" />
            Дар сайт намоён
          </div>
        </div>
      </div>
    </Modal>
  )
}
