import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { isApiClientError, statusFallbackMessage } from "../api/errors";
import { createTask } from "../api/tasks";
import TaskForm from "../components/TaskForm";
import type { TaskInput } from "../types";

export default function TaskCreatePage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Second layer of double-submit protection: `disabled` alone loses to an
  // Enter-key repeat that lands in the same tick.
  const inFlight = useRef(false);

  async function handleSubmit(input: TaskInput) {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setServerError(null);

    try {
      const created = await createTask(input);
      navigate(`/tasks/${created.id}`, {
        replace: true,
        state: { flash: `“${created.title}” created.` },
      });
    } catch (cause) {
      // A 422 `detail` is a plain string on this backend — rendered as-is.
      // Never indexed, never mapped.
      setServerError(isApiClientError(cause) ? cause.detail : statusFallbackMessage(0));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="stack stack--loose">
      <div>
        <Link to="/tasks" className="btn btn--ghost">
          ← Back to tasks
        </Link>
      </div>

      <h1 className="text-headline-3xl" style={{ margin: 0 }}>
        New task
      </h1>

      <TaskForm
        mode="create"
        submitting={submitting}
        submitLabel="Save task"
        serverError={serverError}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/tasks")}
      />
    </div>
  );
}
