import { NavLink, Navigate, Outlet } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { BasketIcon, BoxIcon, ExternalIcon, GridIcon, LogoutIcon, Logo, MoonIcon, ReceiptIcon, SunIcon } from '../components/icons'
import { Spinner } from '../components/ui'
import { OrderWatchProvider, useOrderWatch } from '../pages/orders/OrderWatch'

const SITE_URL = 'http://localhost:3123'

const nav = [
  { to: '/orders', label: 'Фармоишҳо', Icon: ReceiptIcon },
  { to: '/products', label: 'Молҳо', Icon: BoxIcon },
  { to: '/categories', label: 'Категорияҳо', Icon: GridIcon },
  { to: '/bundles', label: 'Маҷмӯаҳо', Icon: BasketIcon },
]

export function AdminLayout() {
  const { user, logout } = useAuth()

  if (user === undefined)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted">
        <Spinner className="h-6 w-6" />
      </div>
    )
  if (user === null) return <Navigate to="/login" replace />

  return (
    <OrderWatchProvider>
      <Shell username={user.username} logout={logout} />
    </OrderWatchProvider>
  )
}

/** Шумораи фармоишҳои нав — нишонаи сурх дар меню. */
function NewBadge({ to }: { to: string }) {
  const { counts } = useOrderWatch()
  if (to !== '/orders' || !counts?.new) return null
  return <span className="ml-auto min-w-5 rounded-full bg-danger px-1.5 text-center text-xs leading-5 font-bold text-white">{counts.new}</span>
}

function Shell({ username, logout }: { username: string; logout: () => void }) {
  return (
    <div className="min-h-screen md:pl-64">
      {/* Sidebar (компютер) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface md:flex">
        <div className="px-6 py-6">
          <Logo />
          <span className="mt-2 inline-block rounded-md bg-accent/20 px-2 py-0.5 text-[11px] font-bold tracking-wide text-[#9a6a00] uppercase dark:text-accent">
            Админ
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent text-on-accent' : 'text-muted hover:bg-surface-2 hover:text-foreground'
                }`
              }
            >
              <Icon />
              {label}
              <NewBadge to={to} />
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 border-t border-border p-3">
          <a
            href={SITE_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <ExternalIcon /> Кушодани сайт
          </a>
          <ThemeToggle />
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-on-accent uppercase">
              {username[0]}
            </span>
            <span className="flex-1 truncate text-sm font-semibold">{username}</span>
            <button
              type="button"
              onClick={logout}
              title="Баромадан"
              aria-label="Баромадан"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-danger"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </aside>

      {/* Сарлавҳа (телефон) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
        <Logo />
        <button
          type="button"
          onClick={logout}
          aria-label="Баромадан"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted"
        >
          <LogoutIcon />
        </button>
      </header>

      <main className="mx-auto max-w-6xl p-4 pb-24 sm:p-6 sm:pb-24 md:pb-8 lg:p-8">
        <Outlet />
      </main>

      {/* Менюи поён (телефон) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {nav.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${isActive ? 'text-foreground' : 'text-muted'}`
            }
          >
            <Icon width={22} height={22} />
            {label}
            <span className="absolute top-1 left-1/2 ml-2">
              <NewBadge to={to} />
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function ThemeToggle() {
  function toggle() {
    const root = document.documentElement
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    root.setAttribute('data-theme', next)
    try {
      localStorage.setItem('admin-theme', next)
    } catch {
      // localStorage дастрас нест — танҳо барои ҳамин сессия
    }
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground"
    >
      <SunIcon className="dark:hidden" />
      <MoonIcon className="hidden dark:block" />
      Мавзӯъ
    </button>
  )
}
