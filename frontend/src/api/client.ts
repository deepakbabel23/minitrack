// The one place the frontend talks to the network. Every screen goes through
// here, so URL-building, the X-API-Key header, and error parsing live in exactly
// one file. This module imports no React — it's plain TypeScript, so it can be
// unit-tested on its own (see frontend/spec.md "API client").

// Where the FastAPI backend lives. Comes from frontend/.env (VITE_API_BASE_URL);
// falls back to the local dev default so the app runs with zero config.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

// The current API key, held in memory. The auth context keeps this in sync via
// setApiKey(). Keeping it here (not in React) is what lets the client stay
// framework-agnostic while every request still gets the header automatically.
let currentApiKey: string | null = null

export function setApiKey(key: string | null): void {
  currentApiKey = key
}

export function getApiKey(): string | null {
  return currentApiKey
}

// The app registers a handler so that a 401 on a request made with the STORED
// key (the key was revoked or changed mid-session) can globally clear the
// session and send the user back to /connect. Requests that pass an explicit
// key override (the Connect screen's verifyKey) do NOT trigger this.
let unauthorizedHandler: (() => void) | null = null
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

// A single error type every screen can catch and inspect. `status` is 0 for a
// network failure (backend down / CORS), otherwise the HTTP status. `detail` is
// always a string. `requestId` is present on 404/422, null on 401.
export class ApiClientError extends Error {
  status: number
  detail: string
  requestId: string | null

  constructor(status: number, detail: string, requestId: string | null = null) {
    super(detail)
    this.name = 'ApiClientError'
    this.status = status
    this.detail = detail
    this.requestId = requestId
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  // Override the stored key (used by the Connect screen to test a candidate
  // before storing it). When omitted, the in-memory key is used.
  apiKey?: string | null
  // Public endpoints like /health don't send the key.
  requireAuth?: boolean
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, apiKey, requireAuth = true } = options
  // Did this request use the stored session key (rather than an explicit
  // override)? Only stored-key 401s trigger the global session reset.
  const usedStoredKey = requireAuth && apiKey === undefined

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (requireAuth) {
    const key = apiKey ?? currentApiKey
    if (key) headers['X-API-Key'] = key
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    // fetch only rejects on a network-level failure: server down, DNS, or a
    // blocked CORS preflight. Turn it into a normal ApiClientError so callers
    // never see an unhandled rejection.
    throw new ApiClientError(0, "Can't reach MiniTrack. Is the backend running?")
  }

  // 204 No Content (DELETE) has no body to parse.
  if (response.status === 204) {
    return undefined as T
  }

  // Read the body once, then parse if there's anything there.
  const text = await response.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    // A stored-key 401 means the session is no longer valid — hand off to the
    // registered handler (clear the key + redirect) before surfacing the error.
    if (response.status === 401 && usedStoredKey) unauthorizedHandler?.()
    throw toApiError(response.status, data)
  }
  return data as T
}

// Build an ApiClientError from a parsed error body. Handles both the
// {detail, request_id} shape and a bare {detail}, and falls back to a
// status-based message when the body is empty or unparseable.
function toApiError(status: number, data: unknown): ApiClientError {
  if (data && typeof data === 'object' && 'detail' in data) {
    const body = data as { detail?: unknown; request_id?: unknown }
    const detail = typeof body.detail === 'string' ? body.detail : fallbackMessage(status)
    const requestId = typeof body.request_id === 'string' ? body.request_id : null
    return new ApiClientError(status, detail, requestId)
  }
  return new ApiClientError(status, fallbackMessage(status))
}

function fallbackMessage(status: number): string {
  if (status === 401) return 'Invalid or missing API key'
  if (status === 404) return 'Not found'
  if (status >= 500) return 'Something went wrong on the server'
  return `Request failed (${status})`
}
