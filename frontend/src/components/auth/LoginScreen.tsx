import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { StewardMark } from '../ui/StewardMark'
import { useAuthStore } from '../../store/auth'

export function LoginScreen() {
  const { login, loading, error } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await login(email, password, mfaCode)
    } catch {
      // The store exposes the backend-safe error message.
    }
  }

  return (
    <main className="min-h-screen bg-bone grid place-items-center px-4">
      <form
        onSubmit={submit}
        className="frame w-full max-w-md p-6 sm:p-8 space-y-5"
      >
        <StewardMark />
        <div>
          <p className="mono-tag">ParishCare / MercyFlow</p>
          <h1 className="display-tight text-3xl font-semibold mt-2">
            Sign in to continue
          </h1>
        </div>
        {error && (
          <p className="text-sm text-oxblood border border-oxblood/30 bg-oxblood/5 rounded-xl p-3">
            {error}
          </p>
        )}
        <label className="block">
          <span className="text-xs text-slate">Email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 w-full border border-hairline bg-bone rounded-xl px-3 py-2.5"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate">
            MFA code (required for officer and pastor accounts)
          </span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
            className="mt-1.5 w-full border border-hairline bg-bone rounded-xl px-3 py-2.5"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 w-full border border-hairline bg-bone rounded-xl px-3 py-2.5"
          />
        </label>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </main>
  )
}
