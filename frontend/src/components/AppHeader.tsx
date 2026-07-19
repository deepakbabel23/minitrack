import { Link } from "react-router-dom";

import { useApiKey } from "../auth/ApiKeyContext";

/** Sticky header: MiniTrack wordmark left, connection control right. */
export default function AppHeader() {
  const { isConnected, disconnect } = useApiKey();

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link to="/" className="app-header__wordmark text-headline-xl">
          MiniTrack
        </Link>

        <div className="app-header__meta">
          {isConnected ? (
            <>
              <span className="badge badge--status-completed">
                <span className="badge__icon" aria-hidden="true">
                  ✓
                </span>
                Connected
              </span>
              <button type="button" className="btn btn--ghost" onClick={() => disconnect()}>
                Disconnect
              </button>
            </>
          ) : (
            <span className="badge badge--status-active">Not connected</span>
          )}
        </div>
      </div>
    </header>
  );
}
