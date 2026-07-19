import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { isApiClientError, statusFallbackMessage } from "../api/errors";
import { getTask, replaceTask } from "../api/tasks";
import ErrorMessage from "../components/ErrorMessage";
import TaskForm from "../components/TaskForm";
import { fromTask } from "../components/taskFormValues";
import type { Task, TaskInput } from "../types";

type ViewState =
  | { kind: "loading" }
  | { kind: "loaded"; task: Task }
  | { kind: "notfound" }
  | { kind: "error"; message: string; requestId: string | null };

export default function TaskEditPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const numericId = Number(taskId);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!Number.isInteger(numericId) || numericId <= 0) {
        setState({ kind: "notfound" });
        return;
      }
      setState({ kind: "loading" });
      try {
        // The whole task is loaded first so the form can be pre-filled with
        // every field — which is what makes the full-replacement PATCH safe.
        const task = await getTask(numericId, { signal });
        setState({ kind: "loaded", task });
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        if (isApiClientError(cause) && cause.isNotFound) {
          setState({ kind: "notfound" });
          return;
        }
        setState({
          kind: "error",
          message: isApiClientError(cause) ? cause.detail : statusFallbackMessage(0),
          requestId: isApiClientError(cause) ? cause.requestId : null,
        });
      }
    },
    [numericId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function handleSubmit(input: TaskInput) {
    if (state.kind !== "loaded" || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setServerError(null);

    try {
      // `input` comes from toTaskInput(), which always carries all three of
      // title, description and priority — never a partial payload, and never
      // `completed`, which PATCH cannot change anyway.
      const updated = await replaceTask(state.task.id, input);
      navigate(`/tasks/${updated.id}`, {
        replace: true,
        state: { flash: "Task updated." },
      });
    } catch (cause) {
      if (isApiClientError(cause) && cause.isNotFound) {
        setState({ kind: "notfound" });
        return;
      }
      setServerError(isApiClientError(cause) ? cause.detail : statusFallbackMessage(0));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const backLink = (
    <div>
      <Link to={taskId ? `/tasks/${taskId}` : "/tasks"} className="btn btn--ghost">
        ← Back to task
      </Link>
    </div>
  );

  if (state.kind === "loading") {
    return (
      <div className="stack stack--loose">
        {backLink}
        <p className="state-block" role="status">
          Loading task…
        </p>
      </div>
    );
  }

  if (state.kind === "notfound") {
    return (
      <div className="stack stack--loose">
        <div>
          <Link to="/tasks" className="btn btn--ghost">
            ← Back to tasks
          </Link>
        </div>
        <div className="empty-state">
          <h1 className="empty-state__title text-headline-2xl">Task not found</h1>
          <p className="empty-state__body text-body-base">
            Task #{taskId} doesn&rsquo;t exist. It may have been deleted.
          </p>
          <Link to="/tasks" className="btn btn--primary">
            Back to tasks
          </Link>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="stack stack--loose">
        {backLink}
        <ErrorMessage
          message={state.message}
          requestId={state.requestId}
          onRetry={() => void load()}
        />
      </div>
    );
  }

  return (
    <div className="stack stack--loose">
      {backLink}

      <h1 className="text-headline-3xl" style={{ margin: 0 }}>
        Edit task
      </h1>

      <TaskForm
        // Remount when the id changes, so navigating between two edit URLs
        // can't leave the previous task's values on screen.
        key={state.task.id}
        mode="edit"
        initialValues={fromTask(state.task)}
        submitting={submitting}
        submitLabel="Save changes"
        serverError={serverError}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/tasks/${state.task.id}`)}
      />
    </div>
  );
}
