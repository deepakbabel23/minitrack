/**
 * Typed wrappers around the six /tasks endpoints.
 *
 * The backend has exactly these. There is no reopen/un-complete endpoint —
 * completion is a one-way door — and no bulk operations.
 */

import { request, requestVoid } from "./client";
import type { Task, TaskInput } from "../types";

/**
 * No trailing slash, ever. `/tasks/` triggers Starlette's 307 redirect, and a
 * redirect on a cross-origin request carrying `X-API-Key` needs a SECOND
 * preflight against the target, which browsers frequently fail.
 */
const TASKS_PATH = "/tasks";

/** The list screen's page size. Backend allows 1-200. */
export const PAGE_SIZE = 20;

export interface ListTasksParams {
  /** Omitted → all tasks. */
  completed?: boolean;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}

export function listTasks(params: ListTasksParams = {}): Promise<Task[]> {
  const { completed, limit = PAGE_SIZE, offset = 0, signal } = params;
  return request<Task[]>(TASKS_PATH, {
    query: { completed, limit, offset },
    signal,
  });
}

export function getTask(taskId: number, options: { signal?: AbortSignal } = {}): Promise<Task> {
  return request<Task>(`${TASKS_PATH}/${taskId}`, options);
}

/**
 * Bodies are built field-by-field rather than spread, so a stray `completed`
 * can't reach the wire even if a caller casts around `TaskInput`'s `never`.
 */
function toBody(input: TaskInput) {
  return { title: input.title, description: input.description, priority: input.priority };
}

export function createTask(input: TaskInput): Promise<Task> {
  return request<Task>(TASKS_PATH, { method: "POST", body: toBody(input) });
}

/**
 * PATCH /tasks/{id} — a FULL replacement, not a partial update.
 *
 * The route binds the same `TaskIn` model as POST, so an omitted `description`
 * is written as NULL and an omitted `priority` resets to "medium". Named
 * `replaceTask` so anyone reaching for a partial payload has to argue with the
 * name first. It cannot change `completed`.
 */
export function replaceTask(taskId: number, input: TaskInput): Promise<Task> {
  return request<Task>(`${TASKS_PATH}/${taskId}`, { method: "PATCH", body: toBody(input) });
}

export function completeTask(taskId: number): Promise<Task> {
  return request<Task>(`${TASKS_PATH}/${taskId}/complete`, { method: "POST" });
}

/** Resolves on 204; rejects with ApiClientError(404) if the id is unknown. */
export function deleteTask(taskId: number): Promise<void> {
  return requestVoid(`${TASKS_PATH}/${taskId}`, { method: "DELETE" });
}

/**
 * Connect-screen validation.
 *
 * Deliberately hits /tasks and NOT /health: health is public and ignores the
 * key, so it would happily "accept" a wrong one. Passes the key explicitly so a
 * rejection doesn't trip the global unauthorized handler.
 */
export async function validateApiKey(
  apiKey: string,
  options: { signal?: AbortSignal } = {},
): Promise<void> {
  await request<Task[]>(TASKS_PATH, {
    query: { limit: 1 },
    apiKey,
    signal: options.signal,
  });
}
