import { describe, expect, it } from "vitest";

import { getApiBaseUrl } from "./client";
import { PAGE_SIZE, deleteTask, listTasks, replaceTask, validateApiKey } from "./tasks";
import { jsonResponse, noContentResponse, stubFetchSequence } from "../test/fetchMock";
import type { Task } from "../types";

const TASK: Task = {
  id: 7,
  title: "Ship the frontend",
  description: "Across eight acts.",
  priority: "high",
  completed: false,
};

describe("listTasks", () => {
  it("requests a full page from the start by default", async () => {
    const fetchMock = stubFetchSequence(jsonResponse([]));

    await listTasks();

    expect(fetchMock.callArgs()[0]).toBe(
      `${getApiBaseUrl()}/tasks?limit=${PAGE_SIZE}&offset=0`,
    );
  });

  it("sends completed=false for the active filter", async () => {
    const fetchMock = stubFetchSequence(jsonResponse([]));

    await listTasks({ completed: false });

    expect(fetchMock.callArgs()[0]).toContain("completed=false");
  });

  /*
   * `/tasks/` triggers Starlette's 307 redirect, and a redirect on a
   * cross-origin request carrying X-API-Key needs a second preflight that
   * browsers frequently fail. The absence of that slash is load-bearing.
   */
  it("never sends a trailing slash on the collection path", async () => {
    const fetchMock = stubFetchSequence(jsonResponse([]));

    await listTasks();

    expect(fetchMock.callArgs()[0]).not.toContain("/tasks/?");
  });
});

describe("replaceTask", () => {
  it("PATCHes a full replacement: exactly title, description and priority", async () => {
    const fetchMock = stubFetchSequence(jsonResponse({ ...TASK, title: "Renamed" }));

    await replaceTask(7, { title: "Renamed", description: "Kept", priority: "high" });

    const [url, init] = fetchMock.callArgs();
    expect(init?.method).toBe("PATCH");
    expect(url).toBe(`${getApiBaseUrl()}/tasks/7`);
    expect(fetchMock.bodyOf()).toEqual({
      title: "Renamed",
      description: "Kept",
      priority: "high",
    });
  });

  it("never puts completed on the wire, since PATCH cannot change it", async () => {
    const fetchMock = stubFetchSequence(jsonResponse(TASK));

    // Cast past TaskInput's `never` guard to prove the runtime body-builder —
    // not just the type — drops the field.
    await replaceTask(7, {
      title: "Renamed",
      description: null,
      priority: "low",
      completed: true,
    } as unknown as Parameters<typeof replaceTask>[1]);

    expect(fetchMock.bodyOf()).not.toHaveProperty("completed");
  });
});

describe("validateApiKey", () => {
  /*
   * /health is public and ignores the key, so it would happily "accept" a wrong
   * one. Validation has to hit an endpoint that actually enforces auth.
   */
  it("validates against GET /tasks rather than /health", async () => {
    const fetchMock = stubFetchSequence(jsonResponse([]));

    await validateApiKey("candidate-key");

    expect(fetchMock.callArgs()[0]).toBe(`${getApiBaseUrl()}/tasks?limit=1`);
    expect(fetchMock.headerOf("X-API-Key")).toBe("candidate-key");
  });
});

describe("deleteTask", () => {
  it("resolves on the backend's empty 204", async () => {
    stubFetchSequence(noContentResponse());

    await expect(deleteTask(7)).resolves.toBeUndefined();
  });
});
