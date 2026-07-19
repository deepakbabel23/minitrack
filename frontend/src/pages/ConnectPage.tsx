import { useId, useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { isApiClientError, statusFallbackMessage } from "../api/errors";
import { validateApiKey } from "../api/tasks";
import { useApiKey } from "../auth/ApiKeyContext";

type Status = "idle" | "validating" | "error";

export default function ConnectPage() {
  const { isConnected, connect, disconnectReason } = useApiKey();
  const navigate = useNavigate();
  const location = useLocation();

  const [key, setKey] = useState("");
  const [remember, setRemember] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const keyFieldId = useId();
  const rememberId = useId();
  const errorId = `${keyFieldId}-error`;

  // Where ProtectedRoute bounced the user from, if anywhere.
  const from = (location.state as { from?: string } | null)?.from ?? "/tasks";

  /*
   * The reason is deliberately NOT cleared on unmount. StrictMode mounts,
   * unmounts and remounts in development, so an unmount cleanup would fire
   * immediately and wipe the banner before it was ever read — during
   * `npm run dev`, which is how this is demoed.
   *
   * It clears itself where it should: store.connect() nulls it on a successful
   * reconnect, and a manual disconnect passes no reason.
   */

  if (isConnected) {
    return <Navigate to={from} replace />;
  }

  const isValidating = status === "validating";
  const canSubmit = key.trim().length > 0 && !isValidating;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = key.trim();
    if (!candidate) return;

    setStatus("validating");
    setError(null);

    try {
      await validateApiKey(candidate);
      connect(candidate, { remember });
      navigate(from, { replace: true });
    } catch (cause) {
      // 401 gets the exact wording the runbook specifies; everything else
      // surfaces the server's own detail string.
      const message = isApiClientError(cause)
        ? cause.isUnauthorized
          ? "That API key was rejected."
          : cause.detail
        : statusFallbackMessage(0);
      setError(message);
      setStatus("error");
    }
  }

  return (
    <div className="page--narrow stack stack--loose" style={{ marginInline: "auto" }}>
      <div className="stack stack--tight">
        <h1 className="text-headline-3xl" style={{ margin: 0 }}>
          Connect to MiniTrack
        </h1>
        <p className="text-body-base text-muted" style={{ margin: 0 }}>
          MiniTrack has no accounts — you connect with an API key rather than
          signing in. It&rsquo;s sent as an <code>X-API-Key</code> header and never
          appears in the URL.
        </p>
      </div>

      {/* Region mounted unconditionally so the announcement actually fires —
          a role="status" that appears together with its text is routinely
          skipped by screen readers. Same reason .flash-region always renders. */}
      <div className="flash-region" role="status" aria-live="polite">
        {disconnectReason && (
          <div className="flash flash--error">
            <span className="flash__icon" aria-hidden="true">
              ⚠
            </span>
            {disconnectReason}
          </div>
        )}
      </div>

      <form className="panel" onSubmit={handleSubmit} noValidate>
        <div className="stack stack--loose">
          <div className={`form-field${status === "error" ? " form-field--error" : ""}`}>
            <label className="form-field__label" htmlFor={keyFieldId}>
              API key
            </label>
            <div style={{ position: "relative", display: "flex" }}>
              <input
                id={keyFieldId}
                className="form-field__input"
                style={{ flex: 1, paddingRight: "4.25rem" }}
                type={revealed ? "text" : "password"}
                value={key}
                onChange={(event) => {
                  setKey(event.target.value);
                  if (status === "error") {
                    setStatus("idle");
                    setError(null);
                  }
                }}
                placeholder="Paste your MiniTrack API key"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={isValidating}
                aria-invalid={status === "error" || undefined}
                aria-describedby={error ? errorId : undefined}
              />
              <button
                type="button"
                className="btn btn--ghost"
                style={{
                  position: "absolute",
                  right: "0.25rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  padding: "0.25rem 0.5rem",
                }}
                onClick={() => setRevealed((value) => !value)}
                aria-pressed={revealed}
              >
                {revealed ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="stack" style={{ gap: "var(--space-1)" }}>
            <label className="row row--tight" htmlFor={rememberId} style={{ gap: "var(--space-2)" }}>
              <input
                id={rememberId}
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
                disabled={isValidating}
              />
              <span className="text-label-md">Remember for this session</span>
            </label>
            <p
              className="text-body-sm text-muted"
              style={{ margin: 0, paddingLeft: "1.6rem" }}
            >
              Stores the key in this tab&rsquo;s sessionStorage so a reload keeps you
              connected; it&rsquo;s cleared when the tab closes. Leave it off on a
              shared computer and the key stays in memory only.
            </p>
          </div>

          {error && (
            <div id={errorId} className="flash flash--error" role="alert">
              <span className="flash__icon" aria-hidden="true">
                ⚠
              </span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={!canSubmit}
            aria-busy={isValidating}
          >
            {isValidating ? "Checking key…" : "Connect to MiniTrack"}
          </button>
        </div>
      </form>
    </div>
  );
}
