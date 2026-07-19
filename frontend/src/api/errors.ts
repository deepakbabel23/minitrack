/**
 * The single error type the API layer throws, plus the status → message table.
 *
 * No React imports anywhere in `src/api/` — this file is unit-testable on its
 * own, and every rejection from `client.ts` is one of these, transport failures
 * included. Callers never have to guess at the shape of what they caught.
 */

export class ApiClientError extends Error {
  /** HTTP status, or 0 for a transport failure (server down, DNS, CORS). */
  readonly status: number;
  /** Always a string. Never an array — see `detail` in `types/index.ts`. */
  readonly detail: string;
  /** Present only when the JSON error body carried one. Absent on 401. */
  readonly requestId: string | null;
  /** Raw body, for debugging. Never rendered — a 500's body is plain text. */
  readonly bodyText: string | null;

  constructor(init: {
    status: number;
    detail: string;
    requestId?: string | null;
    bodyText?: string | null;
  }) {
    super(init.detail);
    this.name = "ApiClientError";
    this.status = init.status;
    this.detail = init.detail;
    this.requestId = init.requestId ?? null;
    this.bodyText = init.bodyText ?? null;

    // Without this, `instanceof` breaks if the class is ever downlevelled,
    // which would quietly turn isApiClientError() into a lie.
    Object.setPrototypeOf(this, ApiClientError.prototype);
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isValidation(): boolean {
    return this.status === 422;
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

/**
 * Used when a response carried no usable `detail` of its own — an empty body, a
 * plain-text 500, or a `detail` that wasn't a string.
 */
export function statusFallbackMessage(status: number): string {
  switch (status) {
    case 0:
      // A CORS rejection is indistinguishable from a dead server in JS: both
      // surface as a rejected fetch. Name both causes so nobody debugs the
      // wrong one.
      return "Can't reach the MiniTrack server. Check that it's running and that CORS allows this origin.";
    case 400:
      return "That request wasn't valid.";
    case 401:
      return "Invalid or missing API key.";
    case 403:
      return "That API key isn't allowed to do this.";
    case 404:
      return "We couldn't find what you asked for.";
    case 409:
      return "That conflicts with the task's current state. Reload and try again.";
    case 422:
      return "Some fields need attention.";
    case 429:
      return "Too many requests. Wait a moment and try again.";
    default:
      if (status >= 500) {
        return "The MiniTrack server had a problem. Try again in a moment.";
      }
      return `Request failed (${status}).`;
  }
}
