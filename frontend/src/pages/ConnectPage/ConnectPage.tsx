import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApiKey } from '../../auth/ApiKeyContext'
import { verifyKey } from '../../api/tasks'
import { ApiClientError } from '../../api/client'
import Button from '../../components/Button/Button'
import styles from './ConnectPage.module.css'

// The entry screen. It VALIDATES the key by calling the real protected endpoint
// (GET /tasks) before storing it — /health can't be used because it ignores the
// key. On success we store the key and go to the task list.
export default function ConnectPage() {
  const { connect } = useApiKey()
  const navigate = useNavigate()

  const [key, setKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [remember, setRemember] = useState(false)
  const [validating, setValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = key.trim()
    if (!trimmed) {
      setError('Enter your API key to connect.')
      return
    }

    setValidating(true)
    setError(null)
    try {
      await verifyKey(trimmed)
      connect(trimmed, remember)
      navigate('/tasks', { replace: true })
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.status === 401 ? 'That API key was rejected.' : err.detail)
      } else {
        setError('Something went wrong. Please try again.')
      }
      setValidating(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <section className={styles.card} aria-labelledby="connectHeading">
        <h1 id="connectHeading" className={styles.title}>
          Connect to MiniTrack
        </h1>
        <p className={styles.lead}>
          MiniTrack uses an <strong>API key</strong> instead of a username and
          password. Paste your key below to connect.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <label className={styles.label} htmlFor="apiKey">
            API key
          </label>
          <div className={styles.keyRow}>
            <input
              id="apiKey"
              className={styles.input}
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={(event) => setKey(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'connectError' : undefined}
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowKey((shown) => !shown)}
              aria-pressed={showKey}
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>

          <label className={styles.remember}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span>
              Remember for this browser session
              <span className={styles.rememberNote}>
                Kept in this tab only and cleared when you close it. Anyone using
                this browser could read it — leave off on shared machines.
              </span>
            </span>
          </label>

          {error && (
            <p id="connectError" className={styles.error} role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            loading={validating}
            className={styles.submit}
          >
            {validating ? 'Connecting…' : 'Connect to MiniTrack'}
          </Button>
        </form>
      </section>
    </div>
  )
}
