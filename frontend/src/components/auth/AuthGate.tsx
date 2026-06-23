import { useEffect, type ReactNode } from 'react'
import { LoginScreen } from './LoginScreen'
import { StewardLogo } from '../ui/StewardLogo'
import { useAuthStore } from '../../store/auth'

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, restore } = useAuthStore()

  useEffect(() => {
    void restore()
  }, [restore])

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-parchment px-4">
        <div className="text-center space-y-4">
          <StewardLogo markSize={40} className="justify-center" />
          <p className="text-sm text-slate">Connecting to Steward…</p>
        </div>
      </main>
    )
  }
  if (!user) {
    return <LoginScreen />
  }
  return children
}
