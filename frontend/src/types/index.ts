/**
 * Wire contracts, mirroring `app/schemas/task.py` and `app/schemas/errors.py`.
 *
 * These are the ONLY fields MiniTrack has. There are no due dates, assignees,
 * tags, comments or subtasks — don't add them here hoping the backend follows.
 */

export type Priority = "low" | "medium" | "high";

export const PRIORITIES: readonly Priority[] = ["low", "medium", "high"];

export function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && (PRIORITIES as readonly string[]).includes(value);
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: Priority;
  completed: boolean;
}

/**
 * The body accepted by POST /tasks and PATCH /tasks/{id}.
 *
 * `completed` and `id` are typed `never` deliberately. PATCH is a FULL
 * replacement that cannot change `completed`, and TypeScript's excess-property
 * check only fires on object *literals* — so without this, passing a whole
 * `Task` where a `TaskInput` is expected would typecheck and ship `completed`
 * over the wire. `never` makes that a compile error instead.
 */
export interface TaskInput {
  title: string;
  description: string | null;
  priority: Priority;
  completed?: never;
  id?: never;
}

/**
 * The uniform error body. Note `detail` is ALWAYS a string on this backend —
 * `app/core/errors.py` joins 422 validation errors with "; " rather than
 * returning FastAPI's default array of {loc, msg, type}.
 *
 * `request_id` is optional because a 401 is a bare HTTPException with no
 * registered handler, so it carries no request_id at all.
 */
export interface ApiError {
  detail: string;
  request_id?: string | null;
}

/** Which tasks the list screen is showing. Absent from the URL means "all". */
export type StatusFilter = "all" | "active" | "completed";
