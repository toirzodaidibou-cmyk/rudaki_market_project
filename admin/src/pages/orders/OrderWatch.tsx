import { createContext, use, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useToast } from '../../components/ui'
import { api } from '../../lib/api'
import type { OrderStatus } from '../../lib/api'

type Counts = Record<OrderStatus, number>
type Watch = { counts: Counts | null; refresh: () => void; version: number }

const WatchContext = createContext<Watch | null>(null)
const POLL_MS = 20_000

/** Овози кӯтоҳи "динг" (бе файл). Браузер танҳо пас аз клики корбар иҷозат медиҳад — пас аз логин ҳаст. */
function ding() {
  try {
    const ctx = new AudioContext()
    for (const [i, f] of [880, 1320].entries()) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = f
      gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.35)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + i * 0.15)
      osc.stop(ctx.currentTime + i * 0.15 + 0.4)
    }
  } catch {
    // овоз дастрас нест
  }
}

/**
 * Ҳар 20 сония шумораи фармоишҳоро месанҷад: нишонаи "нав" дар меню, сарлавҳаи варақа "(2) …",
 * ва агар фармоиши нав ояд — овоз ва паём. version — барои аз нав бор кардани рӯйхат.
 */
export function OrderWatchProvider({ children }: { children: ReactNode }) {
  const toast = useToast()
  const [counts, setCounts] = useState<Counts | null>(null)
  const [version, setVersion] = useState(0)
  const lastNew = useRef<number | null>(null)

  const refresh = useCallback(() => {
    api.orders
      .counts()
      .then((c) => {
        if (lastNew.current !== null && c.new > lastNew.current) {
          ding()
          toast('success', `Фармоиши нав! (${c.new - lastNew.current})`)
          setVersion((v) => v + 1)
        }
        lastNew.current = c.new
        setCounts(c)
      })
      .catch(() => {})
  }, [toast])

  useEffect(() => {
    refresh()
    const id = window.setInterval(refresh, POLL_MS)
    return () => window.clearInterval(id)
  }, [refresh])

  useEffect(() => {
    const base = 'RUDAKI MARKET — Админ'
    document.title = counts?.new ? `(${counts.new}) ${base}` : base
  }, [counts?.new])

  return <WatchContext value={{ counts, refresh, version }}>{children}</WatchContext>
}

export function useOrderWatch(): Watch {
  const w = use(WatchContext)
  if (!w) throw new Error('useOrderWatch бояд дар дохили <OrderWatchProvider> бошад')
  return w
}
