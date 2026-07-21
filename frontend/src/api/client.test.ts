import { describe, expect, it, vi } from "vitest";

import {
  getApiBaseUrl,
  request,
  requestVoid,
  setApiKeyProvider,
  setUnauthorizedHandler,
} from "./client";
import { ApiClientError } from "./errors";
import {
  jsonResponse,
  noContentResponse,
  stubFetchNetworkError,
  stubFetchSequence,
  textResponse,
} from "../test/fetchMock";

/** Asserts the promise rejected with an ApiClientError, and hands it back typed. */
async function captureError(promise: Promise<unknown>): Promise<ApiClientError> {
  try {
    await promise;
  } catch (cause) {
    if (cause instanceof ApiClientError) return cause;
    throw cause;
  }
  throw new Error("Expected the request to reject, but it resolved.");
}

describe("getApiBaseUrl", () => {
  it("never carries a trailing slash, so paths concatenate cleanly", () => {
    expect(getApiBaseUrl()).not.toMatch(/\/$/);
  });
});

describe("request", () => {
  it("resolves the parsed JSON body", async () => {
    stubFetchSequence(jsonResponse([{ id: 1 }]));
    await expect(request("/tasks")).resolves.toEqual([{ id: 1 }]);
  });

  it("surfaces the backend's own detail string on a 4xx", async () => {
    stubFetchSequence(jsonResponse({ detail: "Task not found" }, { status: 404 }));

    const error = await captureError(request("/tasks/999999"));

    expect(error.status).toBe(404);
    expect(error.detail).toBe("Task not found");
    expect(error.isNotFound).toBe(true);
  });

  /*
   * This backend joins validation errors into one string in app/core/errors.py
   * rather than returning FastAPI's default array of {loc, msg, type}. The whole
   * client is built on that, so it gets its own test.
   */
  it("renders a 422 detail verbatim, because this backend sends a string", async () => {
    const detail = "title: Field required; priority: Input should be 'low', 'medium' or 'high'";
    stubFetchSequence(jsonResponse({ detail }, { status: 422 }));

    const error = await captureError(request("/tasks", { method: "POST", body: {} }));

    expect(error.isValidation).toBe(true);
    expect(error.detail).toBe(detail);
  });

  it("ignores a non-string detail rather than indexing into it", async () => {
    // If the backend ever reverted to FastAPI's default shape, this must degrade
    // to the status message — not throw, and not render "[object Object]".
    stubFetchSequence(
      jsonResponse({ detail: [{ loc: ["body", "title"], msg: "Field required" }] }, { status: 422 }),
    );

    const error = await captureError(request("/tasks", { method: "POST", body: {} }));

    expect(error.detail).toBe("Some fields need attention.");
  });

  it("never surfaces a 5xx body, which this backend serves as plain text", async () => {
    stubFetchSequence(textResponse("Internal Server Error", 500));

    const error = await captureError(request("/tasks"));

    expect(error.status).toBe(500);
    expect(error.detail).toBe("The MiniTrack server had a problem. Try again in a moment.");
    // Kept for debugging, but deliberately not the rendered message.
    expect(error.bodyText).toBe("Internal Server Error");
  });

  it("keeps request_id when the error body carries one", async () => {
    stubFetchSequence(
      jsonResponse({ detail: "Task not found", request_id: "abc-123" }, { status: 404 }),
    );

    expect((await captureError(request("/tasks/1"))).requestId).toBe("abc-123");
  });

  it("tolerates a 401 that carries no request_id, as a bare HTTPException does", async () => {
    stubFetchSequence(jsonResponse({ detail: "Invalid or missing API key." }, { status: 401 }));

    const error = await captureError(request("/tasks"));

    expect(error.isUnauthorized).toBe(true);
    expect(error.requestId).toBeNull();
  });

  it("normalises a transport failure to status 0 and names CORS as a cause", async () => {
    stubFetchNetworkError();

    const error = await captureError(request("/tasks"));

    expect(error.status).toBe(0);
    expect(error.isNetworkError).toBe(true);
    expect(error.detail).toMatch(/CORS/);
  });

  it("lets a caller-initiated abort propagate untouched", async () => {
    // An abort is the caller getting what it asked for, not a failure to report.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")));

    await expect(request("/tasks")).rejects.toBeInstanceOf(DOMException);
  });
});

describe("requestVoid", () => {
  it("returns on a 204 without reading a body", async () => {
    const response = noContentResponse();
    const readBody = vi.spyOn(response, "text");
    stubFetchSequence(response);

    await expect(requestVoid("/tasks/1", { method: "DELETE" })).resolves.toBeUndefined();

    expect(readBody).not.toHaveBeenCalled();
  });
});

describe("the API key", () => {
  it("is pulled from the provider at request time and sent as X-API-Key", async () => {
    setApiKeyProvider(() => "demo-key-123");
    const fetchMock = stubFetchSequence(jsonResponse([]));

    await request("/tasks");

    expect(fetchMock.headerOf("X-API-Key")).toBe("demo-key-123");
  });

  it("is never attached to a path outside /tasks", async () => {
    setApiKeyProvider(() => "demo-key-123");
    const fetchMock = stubFetchSequence(jsonResponse({ status: "ok" }));

    await request("/health");

    expect(fetchMock.headerOf("X-API-Key")).toBeUndefined();
  });

  it("never appears in the URL", async () => {
    setApiKeyProvider(() => "demo-key-123");
    const fetchMock = stubFetchSequence(jsonResponse([]));

    await request("/tasks", { query: { limit: 1 } });

    expect(fetchMock.callArgs()[0]).not.toContain("demo-key-123");
  });
});

describe("the mid-session 401 handler", () => {
  it("fires when the request used the stored key", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setApiKeyProvider(() => "stored-key");
    stubFetchSequence(jsonResponse({ detail: "Invalid or missing API key." }, { status: 401 }));

    await captureError(request("/tasks"));

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  /*
   * The Connect screen validates a candidate key by passing it explicitly. A
   * rejected candidate must not tear down a session that is working fine.
   */
  it("stays silent when Connect validates a candidate key", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setApiKeyProvider(() => "stored-key");
    stubFetchSequence(jsonResponse({ detail: "Invalid or missing API key." }, { status: 401 }));

    await captureError(request("/tasks", { apiKey: "candidate-key" }));

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("does not fire for a non-401 failure", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setApiKeyProvider(() => "stored-key");
    stubFetchSequence(jsonResponse({ detail: "Task not found" }, { status: 404 }));

    await captureError(request("/tasks/1"));

    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe("query serialisation", () => {
  it("drops undefined values instead of sending the string 'undefined'", async () => {
    const fetchMock = stubFetchSequence(jsonResponse([]));

    await request("/tasks", { query: { completed: undefined, limit: 20, offset: 0 } });

    expect(fetchMock.callArgs()[0]).toBe(`${getApiBaseUrl()}/tasks?limit=20&offset=0`);
  });
});
