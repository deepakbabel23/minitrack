import { useCallback, useEffect, useReducer, useRef } from "react";

import { isApiClientError, statusFallbackMessage } from "../api/errors";
import { PAGE_SIZE, listTasks } from "../api/tasks";
import type { Task } from "../types";

export type ListStatus = "loading" | "loading-more" | "loaded" | "error";

interface State {
  tasks: Task[];
  /** Where the next page starts. A counter, NOT derived from tasks.length — */
  /** after a delete, a derived offset would silently re-fetch a seen row.    */
  nextOffset: number;
  hasMore: boolean;
  status: ListStatus;
  error: string | null;
  /** Whether the failure was an append, so Retry can resume instead of reset. */
  errorWasAppend: boolean;
}

type Action =
  | { type: "reset" }
  | { type: "load-start"; append: boolean }
  | { type: "load-success"; tasks: Task[]; append: boolean }
  | { type: "load-error"; message: string; append: boolean }
  | { type: "task-updated"; task: Task }
  | { type: "task-removed"; taskId: number };

const INITIAL: State = {
  tasks: [],
  nextOffset: 0,
  hasMore: false,
  status: "loading",
  error: null,
  errorWasAppend: false,
};

/**
 * One reducer rather than five useState calls: a filter change has to reset
 * tasks, offset, hasMore, status and error together. Five setters would leave a
 * frame where tasks are stale but the offset is new, and the next page lands in
 * the wrong place.
 */
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "reset":
      return INITIAL;

    case "load-start":
      return {
        ...state,
        status: action.append ? "loading-more" : "loading",
        error: null,
      };

    case "load-success": {
      const merged = action.append ? [...state.tasks, ...action.tasks] : action.tasks;
      // Offset pagination over a mutating collection can repeat a row; dedupe
      // by id. It can also skip one, which is inherent without a cursor.
      const byId = new Map(merged.map((task) => [task.id, task]));
      return {
        tasks: [...byId.values()],
        nextOffset: state.nextOffset + action.tasks.length,
        // The API returns no total, so a short page is the only signal that
        // there is nothing more.
        hasMore: action.tasks.length === PAGE_SIZE,
        status: "loaded",
        error: null,
        errorWasAppend: false,
      };
    }

    case "load-error":
      // Tasks are left intact: a failed append must not discard the pages
      // already on screen, so Retry can resume rather than start over.
      return {
        ...state,
        status: "error",
        error: action.message,
        errorWasAppend: action.append,
      };

    case "task-updated":
      return {
        ...state,
        tasks: state.tasks.map((task) => (task.id === action.task.id ? action.task : task)),
      };

    case "task-removed":
      return { ...state, tasks: state.tasks.filter((task) => task.id !== action.taskId) };

    default:
      return state;
  }
}

export interface UseTaskListResult {
  tasks: Task[];
  status: ListStatus;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
  /** Resumes an interrupted append, or reloads from the start. */
  retry: () => void;
  applyTaskUpdate: (task: Task) => void;
  removeTask: (taskId: number) => void;
}

export function useTaskList(completed: boolean | undefined): UseTaskListResult {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  // Guards against out-of-order responses: clicking Active → Completed →
  // Active quickly would otherwise append whichever page happens to land last.
  const requestSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const nextOffsetRef = useRef(0);

  nextOffsetRef.current = state.nextOffset;

  const fetchPage = useCallback(
    async (offset: number, append: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const seq = ++requestSeq.current;
      dispatch({ type: "load-start", append });

      try {
        const page = await listTasks({
          completed,
          limit: PAGE_SIZE,
          offset,
          signal: controller.signal,
        });
        if (seq !== requestSeq.current) return; // a newer request won
        dispatch({ type: "load-success", tasks: page, append });
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        if (seq !== requestSeq.current) return;
        const message = isApiClientError(cause) ? cause.detail : statusFallbackMessage(0);
        dispatch({ type: "load-error", message, append });
      }
    },
    [completed],
  );

  // Re-runs whenever the filter changes, which is what resets pagination —
  // there is deliberately no separate "reset pagination" call anywhere.
  useEffect(() => {
    dispatch({ type: "reset" });
    void fetchPage(0, false);
    return () => abortRef.current?.abort();
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    void fetchPage(nextOffsetRef.current, true);
  }, [fetchPage]);

  const reload = useCallback(() => {
    dispatch({ type: "reset" });
    void fetchPage(0, false);
  }, [fetchPage]);

  const retry = useCallback(() => {
    if (state.errorWasAppend) {
      void fetchPage(nextOffsetRef.current, true);
    } else {
      dispatch({ type: "reset" });
      void fetchPage(0, false);
    }
  }, [fetchPage, state.errorWasAppend]);

  const applyTaskUpdate = useCallback((task: Task) => {
    dispatch({ type: "task-updated", task });
  }, []);

  const removeTask = useCallback((taskId: number) => {
    dispatch({ type: "task-removed", taskId });
  }, []);

  return {
    tasks: state.tasks,
    status: state.status,
    error: state.error,
    hasMore: state.hasMore,
    loadMore,
    reload,
    retry,
    applyTaskUpdate,
    removeTask,
  };
}
