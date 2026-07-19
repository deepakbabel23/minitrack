import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { isApiClientError, statusFallbackMessage } from "../api/errors";
import { completeTask, deleteTask, getTask } from "../api/tasks";
import ConfirmDialog from "../components/ConfirmDialog";
import ErrorMessage from "../components/ErrorMessage";
import Flash from "../components/Flash";
import PriorityBadge from "../components/PriorityBadge";
import StatusBadge from "../components/StatusBadge";
import { useFlash, useRouterFlash } from "../hooks/useFlash";
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
  const { flash, showFlash } = useFlash();
  // Picks up "Task created." / "Task updated." handed over on navigation.
  useRouterFlash(showFlash);
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
      showFlash("Task marked complete.");
    } catch (cause) {
      showFlash(isApiClientError(cause) ? cause.detail : statusFallbackMessage(0), "error");
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
      // Already gone is the outcome the user wanted — don't strand them on a
      // page describing a task that no longer exists.
      if (isApiClientError(cause) && cause.isNotFound) {
        navigate("/tasks", { replace: true, state: { flash: "Task was already deleted." } });
        return;
      }
      setConfirmingDelete(false);
      showFlash(isApiClientError(cause) ? cause.detail : statusFallbackMessage(0), "error");
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

  /*
   * Every branch renders inside ONE tree so <Flash> is mounted before any
   * message arrives. Early-returning per state would remount the live region
   * together with its text — which screen readers routinely skip — and that
   * matters here because useRouterFlash fires "Task created." while this page
   * is still in `loading`.
   */
  let body: ReactNode;

  if (state.kind === "loading") {
    body = (
      <p className="state-block" role="status">
        Loading task…
      </p>
    );
  } else if (state.kind === "notfound") {
    body = (
      <div className="empty-state">
        <h1 className="empty-state__title text-headline-2xl">Task not found</h1>
        <p className="empty-state__body text-body-base">
          Task #{taskId} doesn&rsquo;t exist. It may have been deleted.
        </p>
        <Link to="/tasks" className="btn btn--primary">
          Back to tasks
        </Link>
      </div>
    );
  } else if (state.kind === "error") {
    body = (
      <ErrorMessage
        message={state.message}
        requestId={state.requestId}
        onRetry={() => void load()}
      />
    );
  } else {
    const { task } = state;
    body = (
      <>
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
      </>
    );
  }

  return (
    <div className="stack stack--loose">
      {backLink}
      <Flash flash={flash} />
      {body}
    </div>
  );
}
