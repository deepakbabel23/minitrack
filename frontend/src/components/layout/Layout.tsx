import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useApiKey } from '../../auth/ApiKeyContext'
import styles from './Layout.module.css'

// The app shell: a sticky header shared by every screen, with the routed page
// rendered into <Outlet />. The "Disconnect" control only appears once a key is
// stored; clicking it clears the key and returns to /connect.
export default function Layout() {
  const { isConnected, disconnect } = useApiKey()
  const navigate = useNavigate()

  function handleDisconnect() {
    disconnect()
    navigate('/connect', { replace: true })
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.wordmark}>
            MiniTrack
          </Link>
          {isConnected && (
            <div className={styles.status}>
              <span className={styles.connected}>Connected</span>
              <button
                type="button"
                className={styles.disconnect}
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
