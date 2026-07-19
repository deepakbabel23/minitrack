/**
 * Where the API key lives. No React — this is a plain observable store, so
 * `client.ts` can pull from it without importing anything from the UI.
 *
 * Security posture, deliberate:
 *   - the key is held in memory and disappears on reload by default;
 *   - it is persisted ONLY to sessionStorage, ONLY after the user opts in
 *     having been shown the trade-off (see ConnectPage);
 *   - it is never logged, never placed in a URL, and never read from a VITE_*
 *     variable — those are inlined into the bundle and shipped to every visitor.
 */

export const SESSION_STORAGE_KEY = "minitrack_api_key";

export interface ApiKeySnapshot {
  apiKey: string | null;
  remembered: boolean;
  /** Why the session ended, when it ended on its own. Shown on /connect. */
  disconnectReason: string | null;
}

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * One cached object, replaced only on mutation. `useSyncExternalStore` compares
 * snapshots by reference — rebuilding this on every read would loop forever.
 */
let snapshot: ApiKeySnapshot = {
  apiKey: null,
  remembered: false,
  disconnectReason: null,
};

function setSnapshot(next: ApiKeySnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

/* sessionStorage throws in Safari private mode and in sandboxed frames. Every
   access is guarded — losing persistence must never break the app. */
function readStored(): string | null {
  try {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    return stored && stored.trim() ? stored : null;
  } catch {
    return null;
  }
}

function writeStored(key: string): void {
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, key);
  } catch {
    // Persistence is a convenience; degrade to memory-only.
  }
}

function clearStored(): void {
  try {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Nothing to do — if storage is unreachable, nothing is stored.
  }
}

export function getSnapshot(): ApiKeySnapshot {
  return snapshot;
}

/** The function `client.ts` pulls from on every request. */
export function getKey(): string | null {
  return snapshot.apiKey;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Restore an opted-in key. Called once from main.tsx, before React mounts. */
export function hydrateFromSession(): void {
  const stored = readStored();
  if (stored) {
    setSnapshot({ apiKey: stored, remembered: true, disconnectReason: null });
  }
}

export function connect(key: string, options: { remember: boolean }): void {
  const trimmed = key.trim();
  if (!trimmed) return;

  if (options.remember) {
    writeStored(trimmed);
  } else {
    // Drop any key held over from a previous opted-in session.
    clearStored();
  }
  setSnapshot({ apiKey: trimmed, remembered: options.remember, disconnectReason: null });
}

/**
 * `reason` is unused until Act 6 (mid-session 401), but the parameter exists
 * from the start so the auth surface doesn't change later.
 */
export function disconnect(reason?: string): void {
  clearStored();
  setSnapshot({ apiKey: null, remembered: false, disconnectReason: reason ?? null });
}

export function clearDisconnectReason(): void {
  if (snapshot.disconnectReason === null) return;
  setSnapshot({ ...snapshot, disconnectReason: null });
}
