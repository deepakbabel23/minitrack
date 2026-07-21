import { vi } from "vitest";

/**
 * Helpers built on the REAL Response constructor (available in Node 18+).
 *
 * That matters: the 204 and plain-text-500 paths depend on genuine
 * .text()/.json() semantics, and a hand-rolled stub would only ever agree with
 * whatever the implementation already does.
 */

export function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
}

/** For the unhandled-500 case, which this backend serves as text/plain. */
export function textResponse(text: string, status: number): Response {
  return new Response(text, { status, headers: { "Content-Type": "text/plain" } });
}

/** DELETE success — a genuinely empty body. */
export function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

export interface FetchMock {
  mock: ReturnType<typeof vi.fn>;
  /** [url, init] of the nth call. */
  callArgs: (index?: number) => [string, RequestInit | undefined];
  /** Parsed JSON body of the nth call. */
  bodyOf: (index?: number) => unknown;
  headerOf: (name: string, index?: number) => string | undefined;
}

/** Installs a fetch stub that returns each response in order. */
export function stubFetchSequence(...responses: Response[]): FetchMock {
  const mock = vi.fn();
  for (const response of responses) {
    mock.mockResolvedValueOnce(response);
  }
  vi.stubGlobal("fetch", mock);
  return makeFetchMock(mock);
}

/** Installs a fetch stub driven by a handler. */
export function stubFetchWith(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): FetchMock {
  const mock = vi.fn(handler);
  vi.stubGlobal("fetch", mock);
  return makeFetchMock(mock);
}

/** Installs a fetch stub that rejects, i.e. a network or CORS failure. */
export function stubFetchNetworkError(): FetchMock {
  const mock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
  vi.stubGlobal("fetch", mock);
  return makeFetchMock(mock);
}

function makeFetchMock(mock: ReturnType<typeof vi.fn>): FetchMock {
  const callArgs = (index = 0) =>
    mock.mock.calls[index] as [string, RequestInit | undefined];

  return {
    mock,
    callArgs,
    bodyOf: (index = 0) => {
      const body = callArgs(index)[1]?.body;
      return typeof body === "string" ? JSON.parse(body) : undefined;
    },
    headerOf: (name, index = 0) => {
      const headers = callArgs(index)[1]?.headers as Record<string, string> | undefined;
      return headers?.[name];
    },
  };
}
