import { useEffect, type ReactNode } from 'react'
import { LoginScreen } from './LoginScreen'
import { useAuthStore } from '../../store/auth'

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, restore } = useAuthStore()

  useEffect(() => {
    void restore()
  }, [restore])

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-bone text-slate">
        Connecting to ParishCare…
      </main>
    )
  }
  if (!user) {
    return <LoginScreen />
  }
  return children
}
