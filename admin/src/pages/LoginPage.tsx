import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { AlertIcon, LockIcon, Logo } from '../components/icons'
import { Button } from '../components/ui'
import { ApiError } from '../lib/api'

export function LoginPage() {
  const { user, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Хатои номаълум')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Ороиш: нури зард дар замина */}
      <div aria-hidden className="absolute -top-40 -right-40 h-[480px] w-[480px] rounded-full bg-accent/25 blur-3xl" />
      <div aria-hidden className="absolute -bottom-48 -left-40 h-[420px] w-[420px] rounded-full bg-[#ff8a00]/15 blur-3xl" />

      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-sm animate-pop-in rounded-3xl border border-border bg-surface p-8 shadow-xl"
      >
        <Logo className="mb-8 justify-center" />
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-[#b07800] dark:text-accent">
            <LockIcon width={22} height={22} />
          </div>
          <h1 className="text-xl font-bold">Панели идоракунӣ</h1>
          <p className="mt-1 text-sm text-muted">Барои давом додан ворид шавед</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger"
          >
            <AlertIcon width={16} height={16} className="shrink-0" />
            {error}
          </div>
        )}

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium">Логин</span>
          <input
            className="field"
            autoComplete="username"
            autoFocus
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="mb-6 block">
          <span className="mb-1.5 block text-sm font-medium">Парол</span>
          <input
            className="field"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <Button type="submit" loading={loading} className="h-11 w-full text-[15px]">
          Ворид шудан
        </Button>
      </form>
    </main>
  )
}
