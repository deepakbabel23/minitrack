import { useState } from "react";
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
  const { tasks, status, error, hasMore, loadMore, reload, applyTaskUpdate, removeTask } =
    useTaskList(completed);

  const { flash, showFlash } = useFlash();
  // Picks up "Task deleted." / "Task updated." handed over on navigation.
  useRouterFlash(showFlash);

  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      setPendingDelete(null);
    } catch (cause) {
      showFlash(errorText(cause), "error");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const isLoading = status === "loading";
  const isLoadingMore = status === "loading-more";

  return (
    <div className="stack stack--loose">
      <div className="row row--between">
        <h1 className="text-headline-3xl" style={{ margin: 0 }} tabIndex={-1}>
          Tasks
        </h1>
        <Link to="/tasks/new" className="btn btn--primary">
          Create task
        </Link>
      </div>

      <StatusFilterControl value={filter} onChange={setFilter} disabled={isLoading} />

      <Flash flash={flash} />

      {status === "error" && error && (
        <ErrorMessage message={error} onRetry={reload} />
      )}

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
