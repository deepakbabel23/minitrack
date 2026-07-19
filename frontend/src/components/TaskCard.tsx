import { Link } from "react-router-dom";

import PriorityBadge from "./PriorityBadge";
import StatusBadge from "./StatusBadge";
import type { Task } from "../types";

export interface TaskCardProps {
  task: Task;
  busy?: boolean;
  onComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export default function TaskCard({ task, busy = false, onComplete, onDelete }: TaskCardProps) {
  return (
    <article className={`task-card${task.completed ? " task-card--completed" : ""}`}>
      {/*
        A presentational marker, not a control. Completion is one-way on this
        backend — there is no un-complete endpoint — so a real checkbox would
        imply an action that cannot be performed.
      */}
      <span className="task-card__checkbox" aria-hidden="true">
        {task.completed ? "✓" : ""}
      </span>

      <div className="task-card__body">
        <div className="task-card__header">
          <Link to={`/tasks/${task.id}`} className="task-card__title">
            {task.title}
          </Link>
          <PriorityBadge priority={task.priority} />
          <StatusBadge completed={task.completed} />
        </div>
        {task.description && (
          <p className="task-card__description task-card__description--clamp">
            {task.description}
          </p>
        )}
      </div>

      <div className="task-card__actions">
        <Link to={`/tasks/${task.id}`} className="btn btn--ghost">
          View
        </Link>
        <Link to={`/tasks/${task.id}/edit`} className="btn btn--secondary">
          Edit
        </Link>
        {/* Only offered while the task is active. */}
        {!task.completed && (
          <button
            type="button"
            className="btn btn--primary"
            disabled={busy}
            onClick={() => onComplete(task)}
          >
            Complete
          </button>
        )}
        <button
          type="button"
          className="btn btn--ghost btn--ghost-danger"
          disabled={busy}
          onClick={() => onDelete(task)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
