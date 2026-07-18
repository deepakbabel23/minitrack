import { Navigate, Outlet } from 'react-router-dom'
import { useApiKey } from './ApiKeyContext'

// A gate for the task screens: if there's no API key, bounce to /connect.
// Used as a wrapper <Route> in App.tsx; <Outlet /> renders the matched child.
export default function ProtectedRoute() {
  const { isConnected } = useApiKey()
  if (!isConnected) {
    return <Navigate to="/connect" replace />
  }
  return <Outlet />
}
