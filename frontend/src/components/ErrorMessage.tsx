/**
 * Inline error with an optional retry.
 *
 * `requestId` renders only when present — a 401 body carries none, and neither
 * does a plain-text 500 or a network failure, so it can't be assumed.
 */
export interface ErrorMessageProps {
  message: string;
  requestId?: string | null;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, requestId, onRetry }: ErrorMessageProps) {
  return (
    <div className="flash flash--error" role="alert" style={{ alignItems: "flex-start" }}>
      <span className="flash__icon" aria-hidden="true">
        ⚠
      </span>
      <span style={{ flex: 1 }}>
        {message}
        {requestId && (
          <>
            {" "}
            <span className="text-body-sm" style={{ opacity: 0.8 }}>
              (reference {requestId})
            </span>
          </>
        )}
      </span>
      {onRetry && (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
