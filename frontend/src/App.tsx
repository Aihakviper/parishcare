import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './app/routes'
import { AuthGate } from './components/auth/AuthGate'
import { usesBackendApi } from './lib/api/config'

const queryClient = new QueryClient()

export default function App() {
  const app = (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )

  if (!usesBackendApi) {
    return app
  }

  return <AuthGate>{app}</AuthGate>
}
