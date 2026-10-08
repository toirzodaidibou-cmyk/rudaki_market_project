import { useId } from 'react'
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

const base: P = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

const icon = (d: string) => (props: P) => (
  <svg {...base} {...props}>
    <path d={d} />
  </svg>
)

export const PlusIcon = icon('M12 5v14M5 12h14')
export const PencilIcon = icon('M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4')
export const TrashIcon = icon('M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3')
export const SearchIcon = icon('M11 18.5a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15ZM20.5 20.5l-4.2-4.2')
export const LogoutIcon = icon('M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3')
export const GridIcon = icon('M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z')
export const UploadIcon = icon('M12 16V4M7 9l5-5 5 5M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2')
export const XIcon = icon('M18 6 6 18M6 6l12 12')
export const SunIcon = icon(
  'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4',
)
export const MoonIcon = icon('M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z')
export const CheckIcon = icon('m5 12.5 4.5 4.5L19 7.5')
export const AlertIcon = icon('M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z')
export const ImageIcon = icon('M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM9 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM20 15l-5-5L5 20')
export const LockIcon = icon('M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1ZM8 11V7a4 4 0 0 1 8 0v4')
export const ReceiptIcon = icon('M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6M9 16h4')
export const BasketIcon = icon("M5 10h14l-1.5 9a2 2 0 0 1-2 1.7h-7a2 2 0 0 1-2-1.7L5 10ZM3 10h18M8 10l3-6M16 10l-3-6M10 14v3M14 14v3")
export const ChartIcon = icon("M4 20h16M7 16v-5M12 16V6M17 16v-8")
export const BoxIcon = icon('M21 8 12 3 3 8v8l9 5 9-5V8ZM3 8l9 5 9-5M12 13v8')
export const ArrowLeftIcon = icon('M15 18l-6-6 6-6')
export const ArrowRightIcon = icon('M9 18l6-6-6-6')
export const ExternalIcon = icon('M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5')

export function Logo({ className = '' }: { className?: string }) {
  // id-и нодир: агар ду логотип дар саҳифа бошад ва яке пинҳон (display:none), градиент гум намешавад
  const gradientId = useId()
  return (
    <span className={`flex items-center gap-2 select-none ${className}`}>
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className="h-7 w-7 shrink-0">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32">
            <stop offset="0" stopColor="#ffc400" />
            <stop offset="1" stopColor="#ff8a00" />
          </linearGradient>
        </defs>
        <path d="M27.5 21.5A13 13 0 1 1 26.4 8.2" stroke={`url(#${gradientId})`} strokeWidth="4" strokeLinecap="round" />
        <path
          d="M12.5 22V10.5h4.6a3.6 3.6 0 0 1 0 7.2h-4.6M16.6 17.7 20 22"
          stroke={`url(#${gradientId})`}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-[18px] leading-none tracking-tight">
        <span className="font-extrabold">RUDAKI</span>
        <span className="font-normal">MARKET</span>
      </span>
    </span>
  )
}
