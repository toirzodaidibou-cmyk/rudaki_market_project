import type { OrderStatus } from '../../lib/api'

/** Номи ҳолат ва ранги нишона (ҳамон рангҳо дар рӯйхат, тафсилот ва тугмаҳо). */
export const STATUS: Record<OrderStatus, { label: string; action: string; badge: string; button: string }> = {
  new: {
    label: 'Нав',
    action: 'Нав',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
    button: 'bg-amber-500 text-white',
  },
  confirmed: {
    label: 'Тасдиқ шуд',
    action: 'Тасдиқ кардан',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300',
    button: 'bg-sky-600 text-white hover:bg-sky-700',
  },
  delivering: {
    label: 'Дар роҳ',
    action: 'Ба курйер додан',
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300',
    button: 'bg-violet-600 text-white hover:bg-violet-700',
  },
  delivered: {
    label: 'Расонида шуд',
    action: 'Расонида шуд',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
    button: 'bg-emerald-600 text-white hover:bg-emerald-700',
  },
  cancelled: {
    label: 'Бекор шуд',
    action: 'Бекор кардан',
    badge: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300',
    button: 'bg-danger text-white hover:brightness-95',
  },
}

export const PAYMENT: Record<string, string> = { cash: '💵 Нақд', alif: '🟢 Алиф', dc: '🔵 Душанбе Сити', korti_milli: '💳 Корти Миллӣ' }

/** "⚡ Ҳарчи зудтар" ё "8 окт, 18:00–20:00" */
export function deliveryText(from: string | null, to: string | null): string {
  if (!from || !to) return '⚡ Ҳарчи зудтар'
  const end = new Date(to).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Dushanbe', hour: '2-digit', minute: '2-digit' })
  return `🕐 ${formatTime(from)}–${end}`
}

/** Вақти Душанбе: "8 окт, 14:05" */
export const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', {
    timeZone: 'Asia/Dushanbe',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

/** +992 00 268 15 15 */
export const formatPhone = (e164: string) => {
  const d = e164.replace(/\D/g, '').replace(/^992/, '')
  return d.length === 9 ? `+992 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7)}` : e164
}

/** Агар суроға координатҳо дошта бошад ("..., (38.470500, 68.801200)") — пайванд ба харита. */
export function mapLink(address: string): string | null {
  const m = address.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/)
  return m ? `https://www.google.com/maps?q=${m[1]},${m[2]}` : null
}
