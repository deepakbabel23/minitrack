import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { isApiClientError, statusFallbackMessage } from "../api/errors";
import { completeTask, deleteTask, getTask } from "../api/tasks";
import ConfirmDialog from "../components/ConfirmDialog";
import ErrorMessage from "../components/ErrorMessage";
import Flash, { type FlashMessage } from "../components/Flash";
import PriorityBadge from "../components/PriorityBadge";
import StatusBadge from "../components/StatusBadge";
import type { Task } from "../types";

/**
 * Explicit states rather than a soup of booleans. "Not found" in particular is
 * a first-class outcome, not an error — an unknown id is a normal thing for a
 * user to reach via a stale link.
 */
type ViewState =
  | { kind: "loading" }
  | { kind: "loaded"; task: Task }
  | { kind: "notfound" }
  | { kind: "error"; message: string; requestId: string | null };

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [flash, setFlash] = useState<FlashMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const numericId = Number(taskId);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      // A non-numeric id can't exist; don't spend a request finding out.
      if (!Number.isInteger(numericId) || numericId <= 0) {
        setState({ kind: "notfound" });
        return;
      }
      setState({ kind: "loading" });
      try {
        const task = await getTask(numericId, { signal });
        setState({ kind: "loaded", task });
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        // Branch on the status, never on the detail string: a valid route with
        // an unknown id says "Task not found", but an unknown route says
        // "Not Found". Only the status is stable.
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

  async function handleComplete() {
    if (state.kind !== "loaded") return;
    setBusy(true);
    try {
      const updated = await completeTask(state.task.id);
      setState({ kind: "loaded", task: updated });
      setFlash({ id: Date.now(), message: "Task marked complete.", tone: "success" });
    } catch (cause) {
      setFlash({
        id: Date.now(),
        message: isApiClientError(cause) ? cause.detail : statusFallbackMessage(0),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmDelete() {
    if (state.kind !== "loaded") return;
    setBusy(true);
    try {
      await deleteTask(state.task.id);
      navigate("/tasks", { replace: true, state: { flash: "Task deleted." } });
    } catch (cause) {
      setConfirmingDelete(false);
      setFlash({
        id: Date.now(),
        message: isApiClientError(cause) ? cause.detail : statusFallbackMessage(0),
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  const backLink = (
    <div>
      <Link to="/tasks" className="btn btn--ghost">
        ← Back to tasks
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
        {backLink}
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

  const { task } = state;

  return (
    <div className="stack stack--loose">
      {backLink}

      <Flash flash={flash} />

      <article className="panel stack">
        <div className="row row--tight" style={{ gap: "var(--space-3)" }}>
          <PriorityBadge priority={task.priority} />
          <StatusBadge completed={task.completed} />
          <span className="text-label-xs text-subtle">Task #{task.id}</span>
        </div>

        <h1 className="text-headline-2xl" style={{ margin: 0 }}>
          {task.title}
        </h1>

        {task.description ? (
          <p className="text-body-base text-muted" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            {task.description}
          </p>
        ) : (
          <p className="text-body-base text-subtle" style={{ margin: 0 }}>
            No description.
          </p>
        )}

        <div className="row" style={{ gap: "var(--space-3)" }}>
          <Link to={`/tasks/${task.id}/edit`} className="btn btn--secondary">
            Edit
          </Link>
          {/*
            Complete is offered only while the task is active, and there is
            deliberately NO Reopen: the backend has no un-complete endpoint and
            PATCH cannot touch `completed`, so completion is a one-way door.
          */}
          {!task.completed && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleComplete}
              disabled={busy}
            >
              Complete
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--ghost-danger"
            onClick={() => setConfirmingDelete(true)}
            disabled={busy}
          >
            Delete
          </button>
        </div>
      </article>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this task?"
        body={`“${task.title}” will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        confirmTone="danger"
        busy={busy}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
