import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { setApiKey as syncClientKey, setUnauthorizedHandler } from '../api/client'

// React "Context" lets any component read the API key without it being passed
// down through every level as a prop. Think of it as app-wide state for "who is
// connected". See frontend/spec.md "Connection & authentication".

const STORAGE_KEY = 'minitrack_api_key'

interface ApiKeyContextValue {
  apiKey: string | null
  isConnected: boolean
  // Why the session ended, shown on /connect (null = arrived normally).
  reason: string | null
  connect: (key: string, remember: boolean) => void
  disconnect: () => void
}

const ApiKeyContext = createContext<ApiKeyContextValue | null>(null)

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  // On first load, restore a key the user chose to remember for this tab.
  const [apiKey, setKey] = useState<string | null>(() =>
    sessionStorage.getItem(STORAGE_KEY),
  )
  const [reason, setReason] = useState<string | null>(null)

  // Keep the framework-agnostic API client's copy of the key in step with
  // React state, so every request picks up the current key automatically.
  useEffect(() => {
    syncClientKey(apiKey)
  }, [apiKey])

  // Register the global 401 handler once: if a stored-key request is rejected,
  // clear the session and record why. ProtectedRoute then redirects to /connect.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setKey(null)
      sessionStorage.removeItem(STORAGE_KEY)
      setReason('Your API key was rejected. Please reconnect.')
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const value = useMemo<ApiKeyContextValue>(
    () => ({
      apiKey,
      isConnected: apiKey !== null,
      reason,
      connect: (key, remember) => {
        setKey(key)
        setReason(null)
        // "Remember for this session" = sessionStorage (cleared on tab close).
        // Otherwise the key lives only in memory and is gone on refresh.
        if (remember) sessionStorage.setItem(STORAGE_KEY, key)
        else sessionStorage.removeItem(STORAGE_KEY)
      },
      disconnect: () => {
        setKey(null)
        setReason(null)
        sessionStorage.removeItem(STORAGE_KEY)
      },
    }),
    [apiKey, reason],
  )

  return <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>
}

// The hook screens use to read/change connection state. Colocated with the
// provider on purpose — the lint rule below only concerns hot-reload DX, not
// correctness, so we accept it to keep all the auth wiring in one readable file.
// eslint-disable-next-line react-refresh/only-export-components
export function useApiKey(): ApiKeyContextValue {
  const context = useContext(ApiKeyContext)
  if (!context) {
    throw new Error('useApiKey must be used inside <ApiKeyProvider>')
  }
  return context
}
