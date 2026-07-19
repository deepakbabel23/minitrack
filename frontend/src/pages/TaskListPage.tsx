import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { isApiClientError, statusFallbackMessage } from "../api/errors";
import { completeTask, deleteTask } from "../api/tasks";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "../components/EmptyState";
import ErrorMessage from "../components/ErrorMessage";
import Flash from "../components/Flash";
import StatusFilterControl from "../components/StatusFilterControl";
import TaskCard from "../components/TaskCard";
import { useFlash, useRouterFlash } from "../hooks/useFlash";
import { useStatusFilter } from "../hooks/useStatusFilter";
import { useTaskList } from "../hooks/useTaskList";
import type { Task } from "../types";

function errorText(cause: unknown): string {
  return isApiClientError(cause) ? cause.detail : statusFallbackMessage(0);
}

export default function TaskListPage() {
  const { filter, completed, setFilter } = useStatusFilter();
  const { tasks, status, error, hasMore, loadMore, retry, applyTaskUpdate, removeTask } =
    useTaskList(completed);

  const { flash, showFlash } = useFlash();
  // Picks up "Task deleted." / "Task updated." handed over on navigation. When
  // one arrives, the previous screen navigated away under the user (e.g. delete
  // from the detail page), so focus needs a home here too.
  useRouterFlash(showFlash, () => setRestoreFocus(true));

  const headingRef = useRef<HTMLHeadingElement>(null);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoreFocus, setRestoreFocus] = useState(false);

  /*
   * Focus has to move AFTER the dialog closes, not during the delete handler.
   * <dialog>.close() restores focus to whatever opened it — here, the Delete
   * button of a row that has just unmounted — so focusing earlier is silently
   * undone and focus ends up on <body>. ConfirmDialog is a child, and React
   * runs child effects first, so its close() has already happened by the time
   * this effect runs.
   */
  useEffect(() => {
    if (restoreFocus && pendingDelete === null) {
      headingRef.current?.focus();
      setRestoreFocus(false);
    }
  }, [restoreFocus, pendingDelete]);

  async function handleComplete(task: Task) {
    setBusyTaskId(task.id);
    try {
      const updated = await completeTask(task.id);
      // Updated in place rather than removed, even under ?status=active: the
      // badge visibly flips, and the row drops out on the next load.
      applyTaskUpdate(updated);
      showFlash(`“${updated.title}” marked complete.`);
    } catch (cause) {
      showFlash(errorText(cause), "error");
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteTask(pendingDelete.id);
      removeTask(pendingDelete.id);
      showFlash(`“${pendingDelete.title}” deleted.`);
      setRestoreFocus(true);
    } catch (cause) {
      // A 404 means it's already gone — that's the outcome the user asked for,
      // not a failure. Anything else is a real error and the row stays put.
      if (isApiClientError(cause) && cause.isNotFound) {
        removeTask(pendingDelete.id);
        showFlash(`“${pendingDelete.title}” was already deleted.`);
        setRestoreFocus(true);
      } else {
        // The row still exists and its Delete button is still the natural
        // focus target — don't yank the user to the top of a long list for an
        // operation that changed nothing.
        showFlash(errorText(cause), "error");
      }
    } finally {
      setPendingDelete(null);
      setDeleting(false);
    }
  }

  const isLoading = status === "loading";
  const isLoadingMore = status === "loading-more";

  return (
    <div className="stack stack--loose">
      <div className="row row--between">
        {/* tabIndex -1 so it can receive programmatic focus after a delete. */}
        <h1 className="text-headline-3xl" style={{ margin: 0 }} tabIndex={-1} ref={headingRef}>
          Tasks
        </h1>
        <Link to="/tasks/new" className="btn btn--primary">
          Create task
        </Link>
      </div>

      {/*
        Deliberately NOT disabled while loading: disabling the button the user
        just pressed drops focus to <body> and ejects a keyboard user from the
        control. useTaskList already guards against out-of-order responses, so
        the disable bought nothing.
      */}
      <StatusFilterControl value={filter} onChange={setFilter} />

      <Flash flash={flash} />

      {status === "error" && error && <ErrorMessage message={error} onRetry={retry} />}

      {isLoading && (
        <p className="state-block" role="status">
          Loading tasks…
        </p>
      )}

      {status !== "loading" && status !== "error" && tasks.length === 0 && (
        <EmptyState filter={filter} />
      )}

      {tasks.length > 0 && (
        <div className="stack">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              busy={busyTaskId === task.id}
              onComplete={handleComplete}
              onDelete={setPendingDelete}
            />
          ))}
        </div>
      )}

      {/*
        "Load more", not numbered pages: GET /tasks returns a bare array with no
        total, so the only signal that more exist is a full-length page.
      */}
      {hasMore && (
        <div className="row" style={{ justifyContent: "center" }}>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this task?"
        body={
          pendingDelete
            ? `“${pendingDelete.title}” will be permanently removed. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        confirmTone="danger"
        busy={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
