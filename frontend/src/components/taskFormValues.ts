/**
 * The boundary between a `Task` and the form's own value shape.
 *
 * Kept out of TaskForm.tsx so these stay pure and unit-testable without
 * rendering anything — `toTaskInput` in particular is the single point that
 * guarantees a full-replacement payload.
 */

import type { Priority, Task, TaskInput } from "../types";

/**
 * A <textarea> cannot hold null, so `description` is a plain string here and
 * the null conversion happens in `toTaskInput`.
 *
 * Note this structurally cannot carry `id` or `completed`, so no code path in
 * the form can send either.
 */
export interface TaskFormValues {
  title: string;
  description: string;
  priority: Priority;
}

export const EMPTY_TASK_FORM_VALUES: TaskFormValues = {
  title: "",
  description: "",
  priority: "medium",
};

export function fromTask(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
  };
}

/**
 * The full-replacement guarantee, in one place.
 *
 * Always returns all three fields, so Create and Edit share an identical code
 * path and no caller can produce a partial payload. PATCH on this backend is a
 * full replacement: an omitted description would be written as NULL and an
 * omitted priority reset to "medium".
 */
export function toTaskInput(values: TaskFormValues): TaskInput {
  const description = values.description.trim();
  return {
    title: values.title.trim(),
    description: description === "" ? null : description,
    priority: values.priority,
  };
}
