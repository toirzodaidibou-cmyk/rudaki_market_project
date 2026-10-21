import { useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { ClipboardPaste, ExternalLink, ImageIcon as ImgIcon, SkipForward, Upload } from 'lucide-react'
import { Button, Modal, useToast } from '../../components/ui'
import { api, ApiError, fileUrl } from '../../lib/api'
import type { Product, ProductListItem } from '../../lib/api'
import { MAX_IMAGE_BYTES, prepareImage } from '../../lib/images'

type Picked = { file: File; src: string }

/**
 * Ёрдамчии «Иваз кардани сурат»: молҳо пай дар пай. Сурат дар Google ё Яндекс ҷустуҷӯ мешавад (варақаи нав),
 * баъд бо Ctrl+V («Копировать изображение»), кашидан ё интихоби файл гузошта мешавад ва ҳамаи суратҳои
 * кӯҳна иваз мешаванд (нишони «муваққатӣ» хориҷ). Сурат одам бо чашм интихоб мекунад — моли нодуруст намеояд.
 */
export function PhotoReplaceModal({
  queue,
  startIndex,
  onReplaced,
  onClose,
}: {
  queue: ProductListItem[]
  startIndex: number
  onReplaced: (product: Product) => void
  onClose: () => void
}) {
  const toast = useToast()
  const [index, setIndex] = useState(startIndex)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [saving, setSaving] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const item = queue[index]

  // Ҳар мол — аз нав
  useEffect(() => {
    setPicked((p) => {
      if (p) URL.revokeObjectURL(p.src)
      return null
    })
    setHint(null)
  }, [index])

  async function take(file: File | null | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setHint('Ин сурат нест.')
      return
    }
    const ready = await prepareImage(file)
    if (!ready || ready.size > MAX_IMAGE_BYTES) {
      setHint('Суратро хонда натавонистам ё он хеле калон аст.')
      return
    }
    setHint(null)
    setPicked((p) => {
      if (p) URL.revokeObjectURL(p.src)
      return { file: ready, src: URL.createObjectURL(ready) }
    })
  }

  // Ctrl+V дар ҳар ҷои саҳифа, вақте равзана кушода аст
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith('image/'))?.getAsFile()
      if (file) {
        e.preventDefault()
        void take(file)
      } else if (e.clipboardData?.getData('text')) {
        setHint('Дар буфер матн аст, на сурат. Дар Google ба сурат тугмаи рости мушро пахш кунед → «Копировать изображение».')
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
    // take ҳар рендер нав аст; listener танҳо як бор
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'))
    if (file) void take(file)
    else setHint('Суратро аз сайти дигар кашида гузоштан намешавад — «Копировать изображение» ва Ctrl+V-ро истифода баред.')
  }

  async function save() {
    if (!picked || !item) return
    setSaving(true)
    try {
      const saved = await api.products.replaceImages(item.id, [picked.file])
      onReplaced(saved)
      toast('success', `«${item.name.tg}» — сурат иваз шуд`)
      if (index + 1 < queue.length) setIndex(index + 1)
      else onClose()
    } catch (e) {
      toast('error', e instanceof ApiError ? e.message : 'Хато')
    } finally {
      setSaving(false)
    }
  }

  if (!item) return null
  const query = `${item.name.ru} ${item.sizeLabel ?? ''}`.trim()
  const google = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`
  const yandex = `https://yandex.ru/images/search?text=${encodeURIComponent(query)}`

  return (
    <Modal
      open
      onClose={onClose}
      title={`Иваз кардани сурат · ${index + 1} аз ${queue.length}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => (index + 1 < queue.length ? setIndex(index + 1) : onClose())}>
            <SkipForward size={16} /> Гузаронидан
          </Button>
          <Button onClick={save} loading={saving} disabled={!picked}>
            Захира ва навбатӣ
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-lg font-bold">{item.name.ru}</p>
          <p className="text-sm text-muted">
            {item.name.tg}
            {item.sizeLabel && <> · <b className="text-foreground">{item.sizeLabel}</b></>}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a href={google} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#1a73e8] px-4 text-sm font-bold text-white hover:brightness-95">
            <ExternalLink size={16} /> Ҷустуҷӯ дар Google
          </a>
          <a href={yandex} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#fc3f1d] px-4 text-sm font-bold text-white hover:brightness-95">
            <ExternalLink size={16} /> Яндекс Картинки
          </a>
        </div>
        <p className="text-xs text-muted">
          Сурати <b>ҳамон</b> молро интихоб кунед (бренд, таъм ва андоза), беҳтараш дар заминаи сафед. Ба сурат тугмаи рости мушро
          пахш кунед → «Копировать изображение», баъд ин ҷо <b>Ctrl+V</b>. Дар телефон — суратро захира кунед ва «Интихоби файл».
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <figure className="rounded-2xl border border-border p-3">
            <figcaption className="mb-2 text-xs font-semibold text-muted">Ҳозира (муваққатӣ)</figcaption>
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-white">
              {item.thumb ? <img src={fileUrl(item.thumb)!} alt="" className="h-full w-full object-contain p-2" /> : <ImgIcon className="text-muted" />}
            </div>
          </figure>

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`rounded-2xl border-2 border-dashed p-3 transition-colors ${dragOver ? 'border-accent bg-accent/10' : 'border-border'}`}
          >
            <p className="mb-2 text-xs font-semibold text-muted">Нав</p>
            {picked ? (
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-white">
                <img src={picked.src} alt="" className="h-full w-full object-contain p-2" />
              </div>
            ) : (
              <div className="flex aspect-square flex-col items-center justify-center gap-3 rounded-xl bg-surface-2 p-4 text-center text-sm text-muted">
                <ClipboardPaste size={30} />
                <span>
                  <b className="text-foreground">Ctrl+V</b> — гузоштани сурат
                  <br />ё файлро ин ҷо кашед
                </span>
                <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                  <Upload size={16} /> Интихоби файл
                </Button>
              </div>
            )}
            {picked && (
              <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 text-xs font-semibold text-muted hover:text-foreground">
                Дигар сурат интихоб кардан
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void take(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </div>
        </div>
        {hint && <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">{hint}</p>}
      </div>
    </Modal>
  )
}
