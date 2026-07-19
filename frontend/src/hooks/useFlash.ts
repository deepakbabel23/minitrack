import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { FlashMessage, FlashTone } from "../components/Flash";

const DEFAULT_TIMEOUT_MS = 5000;

export interface UseFlashResult {
  flash: FlashMessage | null;
  showFlash: (message: string, tone?: FlashTone) => void;
  clearFlash: () => void;
}

/**
 * A transient confirmation message.
 *
 * Router-free on purpose, so it can be tested with renderHook and no router.
 * Cross-navigation messages travel separately, via useRouterFlash below.
 */
export function useFlash(timeoutMs: number = DEFAULT_TIMEOUT_MS): UseFlashResult {
  const [flash, setFlash] = useState<FlashMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic, so showing the same text twice still produces a new id.
  const nextId = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearFlash = useCallback(() => {
    clearTimer();
    setFlash(null);
  }, [clearTimer]);

  const showFlash = useCallback(
    (message: string, tone: FlashTone = "success") => {
      clearTimer();
      // A changing id matters for screen readers: re-rendering identical text
      // is not an update, so the announcement would be silently skipped.
      setFlash({ id: (nextId.current += 1), message, tone });
      timerRef.current = setTimeout(() => setFlash(null), timeoutMs);
    },
    [clearTimer, timeoutMs],
  );

  useEffect(() => clearTimer, [clearTimer]);

  return { flash, showFlash, clearFlash };
}

/**
 * Consumes a message handed over through router navigation state exactly once,
 * then strips it from history so a refresh or a Back doesn't replay it.
 */
export function useRouterFlash(showFlash: (message: string, tone?: FlashTone) => void): void {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const incoming = (location.state as { flash?: unknown } | null)?.flash;
    if (typeof incoming !== "string" || !incoming) return;

    showFlash(incoming);
    navigate(location.pathname + location.search, { replace: true, state: null });
    // Intentionally keyed on the state object only: re-running on every
    // showFlash identity change would re-announce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);
}
