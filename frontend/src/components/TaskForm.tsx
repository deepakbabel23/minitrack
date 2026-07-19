import { useRef, useState, type FormEvent } from "react";

import FormField from "./FormField";
import { EMPTY_TASK_FORM_VALUES, toTaskInput, type TaskFormValues } from "./taskFormValues";
import { PRIORITIES, isPriority, type Priority, type TaskInput } from "../types";

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export interface TaskFormProps {
  mode: "create" | "edit";
  initialValues?: TaskFormValues;
  submitting: boolean;
  submitLabel?: string;
  /** The backend's 422 `detail`, verbatim. Typed string, so it can't be an array. */
  serverError?: string | null;
  onSubmit: (input: TaskInput) => void;
  onCancel: () => void;
}

export default function TaskForm({
  mode,
  initialValues = EMPTY_TASK_FORM_VALUES,
  submitting,
  submitLabel = "Save task",
  serverError,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>(initialValues);
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    // Client-side gate: a blank or whitespace-only title never reaches the
    // network. The backend would reject it with a 422 anyway, but there's no
    // reason to spend a round trip discovering that.
    if (values.title.trim() === "") {
      setTitleError("Title is required.");
      titleRef.current?.focus();
      return;
    }

    setTitleError(null);
    onSubmit(toTaskInput(values));
  }

  return (
    <form className="panel" onSubmit={handleSubmit} noValidate>
      <div className="stack stack--loose">
        <FormField label="Title" error={titleError} required>
          {(fieldProps) => (
            <input
              {...fieldProps}
              ref={titleRef}
              className="form-field__input"
              value={values.title}
              onChange={(event) => {
                setValues((current) => ({ ...current, title: event.target.value }));
                if (titleError) setTitleError(null);
              }}
              placeholder="e.g. Review pull request"
              disabled={submitting}
            />
          )}
        </FormField>

        <FormField label="Description" hint="Optional.">
          {(fieldProps) => (
            <textarea
              {...fieldProps}
              className="form-field__textarea"
              rows={4}
              value={values.description}
              onChange={(event) =>
                setValues((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Add supporting detail…"
              disabled={submitting}
            />
          )}
        </FormField>

        <FormField label="Priority">
          {(fieldProps) => (
            <select
              {...fieldProps}
              className="form-field__select"
              value={values.priority}
              onChange={(event) => {
                // A DOM value is a string; `as Priority` would be a lie.
                const next = event.target.value;
                if (isPriority(next)) {
                  setValues((current) => ({ ...current, priority: next }));
                }
              }}
              disabled={submitting}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
          )}
        </FormField>

        {serverError && (
          <div className="flash flash--error" role="alert">
            <span className="flash__icon" aria-hidden="true">
              ⚠
            </span>
            {serverError}
          </div>
        )}

        <div className="row row--end">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? "Saving…" : submitLabel}
          </button>
        </div>

        <p className="sr-only">
          {mode === "edit"
            ? "Saving replaces the task's title, description and priority."
            : ""}
        </p>
      </div>
    </form>
  );
}
