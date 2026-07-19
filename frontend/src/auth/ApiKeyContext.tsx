/**
 * React binding over `apiKeyStore`. Holds no state of its own — the store is
 * the source of truth, so `client.ts` and the UI can never disagree about
 * whether there's a key.
 *
 * Performs no network calls: ConnectPage validates a candidate key and only
 * then calls `connect`, which keeps this layer free of transport concerns.
 */

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

import * as store from "./apiKeyStore";
import type { ApiKeySnapshot } from "./apiKeyStore";

export interface ApiKeyContextValue extends ApiKeySnapshot {
  isConnected: boolean;
  connect: (key: string, options: { remember: boolean }) => void;
  disconnect: (reason?: string) => void;
  clearDisconnectReason: () => void;
}

const ApiKeyContext = createContext<ApiKeyContextValue | null>(null);

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const value = useMemo<ApiKeyContextValue>(
    () => ({
      ...snapshot,
      isConnected: snapshot.apiKey !== null,
      connect: store.connect,
      disconnect: store.disconnect,
      clearDisconnectReason: store.clearDisconnectReason,
    }),
    [snapshot],
  );

  return <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>;
}

/*
 * The provider and its hook deliberately live together: RUNBOOK.md specifies
 * `src/auth/ApiKeyContext.tsx` as the module exposing `useApiKey()`, and
 * splitting them would trade a clearer public API for a fast-refresh nicety.
 * Editing this file remounts the tree, which is the right behaviour anyway
 * since it holds session state.
 */
// oxlint-disable-next-line react/only-export-components
export function useApiKey(): ApiKeyContextValue {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error("useApiKey must be used inside an <ApiKeyProvider>.");
  }
  return context;
}
