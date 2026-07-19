import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

// A one-off confirmation message passed between screens via navigation state
// (e.g. navigate('/tasks', { state: { flash: 'Task created.' } })). It's read
// once, then scrubbed from history so a refresh or back-navigation won't replay
// it. A custom hook keeps this behavior in one place for every screen that shows
// a flash.
export function useFlash(): string | null {
  const location = useLocation()
  const [flash] = useState<string | null>(
    () => (location.state as { flash?: string } | null)?.flash ?? null,
  )
  useEffect(() => {
    if (flash) window.history.replaceState(null, '')
  }, [flash])
  return flash
}
