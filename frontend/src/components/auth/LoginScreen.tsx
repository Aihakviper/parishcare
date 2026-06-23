import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { StewardLogo } from '../ui/StewardLogo'
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
    <main className="min-h-screen bg-parchment flex flex-col">
      <header className="px-4 pt-6 sm:px-8">
        <StewardLogo markSize={36} to="/marketing" />
      </header>

      <div className="flex-1 grid place-items-center px-4 py-10">
        <form
          onSubmit={submit}
          className="frame w-full max-w-md p-6 sm:p-8 space-y-5 bg-bone"
        >
          <div className="text-center sm:text-left">
            <p className="mono-tag">Parish Console · Officer access</p>
            <h1 className="display-tight text-3xl font-semibold text-ink mt-2">
              Sign in to continue
            </h1>
            <p className="text-sm text-slate mt-2 leading-relaxed">
              Pastor and officer accounts use MFA. Camp demo visitors can skip this and{' '}
              <Link to="/marketing" className="font-semibold text-oxblood hover:underline">
                enter the demo
              </Link>
              .
            </p>
          </div>

          {error && (
            <p className="text-sm text-oxblood border border-oxblood/30 bg-oxblood/5 rounded-xl p-3">
              {error}
            </p>
          )}

          <label className="block">
            <span className="text-xs font-medium text-slate">Email</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full border border-hairline bg-bone rounded-xl px-3 py-2.5 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-gilt"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate">
              MFA code (required for officer and pastor accounts)
            </span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value)}
              className="mt-1.5 w-full border border-hairline bg-bone rounded-xl px-3 py-2.5 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-gilt"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 w-full border border-hairline bg-bone rounded-xl px-3 py-2.5 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-gilt"
            />
          </label>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </main>
  )
}
