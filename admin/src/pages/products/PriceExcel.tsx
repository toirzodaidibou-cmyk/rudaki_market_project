import { useRef, useState } from 'react'
import { AlertIcon, UploadIcon } from '../../components/icons'
import { Button, Modal, useToast } from '../../components/ui'
import { ApiError, api, formatPrice } from '../../lib/api'
import type { PricePreview } from '../../lib/api'

/**
 * Нархҳо бо Excel: "Excel" — файл бо ҳамаи молҳо (ё категорияи интихобшуда) →
 * дар Excel Нарх / Нархи кӯҳна / Фаъол иваз мешавад → "Бор кардан" → пешнамоиш → "Татбиқ".
 */
export function PriceExcel({ categoryId, onApplied }: { categoryId: number | null; onApplied: () => void }) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [preview, setPreview] = useState<PricePreview | null>(null)
  const [applying, setApplying] = useState(false)

  async function download() {
    setDownloading(true)
    try {
      const blob = await api.prices.export(categoryId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rudaki-market-narkh-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast('error', 'Файл гирифта нашуд')
    } finally {
      setDownloading(false)
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return
    setChecking(true)
    try {
      setPreview(await api.prices.preview(file))
    } catch (e) {
      toast('error', e instanceof ApiError ? (Object.values(e.fieldErrors)[0]?.[0] ?? e.message) : 'Хато')
    } finally {
      setChecking(false)
      if (input.current) input.current.value = ''
    }
  }

  async function apply() {
    if (!preview) return
    setApplying(true)
    try {
      const { updated } = await api.prices.apply(
        preview.changes.map((c) => ({ id: c.id, price: c.newPrice, oldPrice: c.newOldPrice, isActive: c.newIsActive })),
      )
      toast('success', `${updated} мол нав шуд`)
      setPreview(null)
      onApplied()
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Хато')
    } finally {
      setApplying(false)
    }
  }

  const price = (v: number | null) => (v === null ? '—' : formatPrice(v))

  return (
    <>
      <Button variant="secondary" onClick={download} loading={downloading} className="h-11" title="Нархҳоро ба Excel гирифтан">
        📥 Excel
      </Button>
      <Button variant="secondary" onClick={() => input.current?.click()} loading={checking} className="h-11" title="Excel-и ивазшударо бор кардан">
        <UploadIcon /> Бор кардан
      </Button>
      <input ref={input} type="file" accept=".xlsx" hidden onChange={(e) => upload(e.target.files?.[0])} />

      <Modal
        open={preview !== null}
        onClose={() => setPreview(null)}
        title="Тағйироти нархҳо"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Бекор
            </Button>
            <Button onClick={apply} loading={applying} disabled={!preview?.changes.length}>
              Татбиқ ({preview?.changes.length ?? 0})
            </Button>
          </>
        }
      >
        {preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-surface-2 p-3">
                <p className="text-2xl font-extrabold tabular-nums">{preview.rows}</p>
                <p className="text-xs text-muted">сатр дар файл</p>
              </div>
              <div className="rounded-xl bg-accent/20 p-3">
                <p className="text-2xl font-extrabold tabular-nums">{preview.changes.length}</p>
                <p className="text-xs text-muted">иваз мешавад</p>
              </div>
              <div className={`rounded-xl p-3 ${preview.errors.length ? 'bg-danger/10' : 'bg-surface-2'}`}>
                <p className={`text-2xl font-extrabold tabular-nums ${preview.errors.length ? 'text-danger' : ''}`}>{preview.errors.length}</p>
                <p className="text-xs text-muted">хато</p>
              </div>
            </div>

            {preview.errors.length > 0 && (
              <div className="rounded-xl bg-danger/10 p-3 text-sm">
                <p className="mb-1 flex items-center gap-1.5 font-semibold text-danger">
                  <AlertIcon width={16} height={16} /> Ин сатрҳо гирифта намешаванд:
                </p>
                <ul className="max-h-40 space-y-0.5 overflow-y-auto">
                  {preview.errors.map((e, i) => (
                    <li key={i}>
                      <b>Сатри {e.line}:</b> {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {preview.changes.length === 0 ? (
              <p className="py-6 text-center text-muted">Ягон нарх иваз нашудааст.</p>
            ) : (
              <ul className="max-h-[45vh] divide-y divide-border overflow-y-auto rounded-xl border border-border text-sm">
                {preview.changes.map((c) => (
                  <li key={c.id} className="px-3 py-2">
                    <p className="line-clamp-1 font-medium">
                      <span className="text-muted">#{c.id}</span> {c.name}
                    </p>
                    <p className="mt-0.5 flex flex-wrap gap-x-4 text-xs tabular-nums">
                      {c.price !== c.newPrice && (
                        <span>
                          Нарх: <s className="text-muted">{price(c.price)}</s> → <b>{price(c.newPrice)}</b>
                        </span>
                      )}
                      {c.oldPrice !== c.newOldPrice && (
                        <span>
                          Аксия: <s className="text-muted">{price(c.oldPrice)}</s> → <b className="text-danger">{price(c.newOldPrice)}</b>
                        </span>
                      )}
                      {c.isActive !== c.newIsActive && <span>{c.newIsActive ? '👁 Намоён мешавад' : '🙈 Пинҳон мешавад'}</span>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
