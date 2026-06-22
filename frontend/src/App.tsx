import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './app/routes'
import { AuthGate } from './components/auth/AuthGate'
import { usesBackendApi } from './lib/api/config'

export default function App() {
  const routes = (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
  if (!usesBackendApi) {
    return routes
  }
  return (
    <AuthGate>
      {routes}
    </AuthGate>
  )
}
