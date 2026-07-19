/**
 * The one fetch wrapper every API call goes through.
 *
 * Framework-agnostic on purpose: no React, no react-router, no import from
 * `src/auth/`. The API key arrives through a provider function that `main.tsx`
 * registers — see `setApiKeyProvider` for why it's a pull and not a push.
 */

import { ApiClientError, statusFallbackMessage } from "./errors";

const DEFAULT_BASE_URL = "http://127.0.0.1:8000";

export type ApiKeyProvider = () => string | null;
export type UnauthorizedHandler = (error: ApiClientError, context: { path: string }) => void;

let apiKeyProvider: ApiKeyProvider | null = null;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/**
 * Register how the client obtains the current API key.
 *
 * This is a PULL — the provider is called at request time — rather than a
 * `setApiKey(key)` push from a React effect. React runs child effects before
 * parent effects, so a page fetching on mount would fire before a pushed key
 * had landed, get a 401, and trip the unauthorized handler into tearing down a
 * perfectly good session. Pulling makes that race impossible.
 */
export function setApiKeyProvider(provider: ApiKeyProvider | null): void {
  apiKeyProvider = provider;
}

/** Wired in Act 6. Fires only for requests that used the stored key. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  const raw =
    typeof configured === "string" && configured.trim() ? configured.trim() : DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export type QueryValue = string | number | boolean | undefined;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** Serialised to JSON when present. */
  body?: unknown;
  /** `undefined` values are dropped, so callers don't branch on optionals. */
  query?: Record<string, QueryValue>;
  /**
   * Explicit key, bypassing the provider. Used ONLY by the Connect screen to
   * validate a candidate key — see the 401 guard below.
   */
  apiKey?: string;
  signal?: AbortSignal;
}

function serializeQuery(query: Record<string, QueryValue> | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface ParsedErrorBody {
  detail: string;
  requestId: string | null;
  bodyText: string | null;
}

/**
 * Extract a displayable error from a failed response without ever throwing.
 *
 * Reads `.text()` and never `.json()`: an unhandled 500 on this backend returns
 * plain text, and a proxy may return HTML, either of which would make
 * `response.json()` reject with a SyntaxError that masks the real failure.
 */
async function readErrorBody(response: Response): Promise<ParsedErrorBody> {
  const bodyText = await response.text().catch(() => "");
  const fallback = statusFallbackMessage(response.status);

  // Never surface a 5xx body — it's plain text or an HTML error page.
  if (response.status >= 500) {
    return { detail: fallback, requestId: null, bodyText: bodyText || null };
  }
  if (!bodyText.trim()) {
    return { detail: fallback, requestId: null, bodyText: null };
  }

  try {
    const parsed: unknown = JSON.parse(bodyText);
    if (isRecord(parsed)) {
      // Accept `detail` ONLY when it's a string. This is the structural guard
      // against the "422 detail is an array" mistake: even if the backend
      // changed shape, nothing here would index into it.
      const detail = typeof parsed.detail === "string" ? parsed.detail : fallback;
      const requestId = typeof parsed.request_id === "string" ? parsed.request_id : null;
      return { detail, requestId, bodyText };
    }
  } catch {
    // Not JSON — fall through to the status-based message.
  }
  return { detail: fallback, requestId: null, bodyText };
}

async function send(path: string, options: RequestOptions): Promise<Response | null> {
  const { method = "GET", body, query, apiKey, signal } = options;

  const usedExplicitKey = apiKey !== undefined;
  const key = apiKey ?? apiKeyProvider?.() ?? null;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (key && path.startsWith("/tasks")) headers["X-API-Key"] = key;

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}${serializeQuery(query)}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    // A caller-initiated abort isn't a failure — let it propagate untouched.
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiClientError({ status: 0, detail: statusFallbackMessage(0) });
  }

  // 204 No Content (DELETE). Return before any body read.
  if (response.status === 204 || response.status === 205) return null;

  if (!response.ok) {
    const { detail, requestId, bodyText } = await readErrorBody(response);
    const error = new ApiClientError({ status: response.status, detail, requestId, bodyText });

    // Only a request made with the STORED key means "your session died". The
    // Connect screen passes an explicit candidate key, and a rejected candidate
    // must not tear down an existing session.
    if (response.status === 401 && !usedExplicitKey) {
      unauthorizedHandler?.(error, { path });
    }
    throw error;
  }

  return response;
}

/** Resolves the parsed JSON body. Throws ApiClientError on any failure. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  if (response === null) return undefined as T;

  const text = await response.text();
  if (!text.trim()) return undefined as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiClientError({
      status: response.status,
      detail: statusFallbackMessage(502),
      bodyText: text,
    });
  }
}

/** For endpoints with no response body (DELETE → 204). Never reads one. */
export async function requestVoid(path: string, options: RequestOptions = {}): Promise<void> {
  await send(path, options);
}

export { ApiClientError } from "./errors";
