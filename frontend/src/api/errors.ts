import { ApiClientError } from './client'

// A user-facing view of any thrown error: a message plus an optional
// troubleshooting id. Screens store this and hand it to <ErrorMessage />.
export interface DisplayError {
  message: string
  requestId: string | null
}

// Turn any caught value into a DisplayError. An ApiClientError carries a
// server-provided message (and request_id on 404/422); anything else gets a
// single generic fallback so the wording is consistent everywhere.
export function toDisplayError(err: unknown): DisplayError {
  if (err instanceof ApiClientError) {
    return { message: err.detail, requestId: err.requestId }
  }
  return { message: 'Something went wrong. Please try again.', requestId: null }
}
