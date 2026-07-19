import { Link } from "react-router-dom";

import type { StatusFilter } from "../types";

/** Wording is tailored per filter — "no tasks" is wrong when a filter is on. */
const MESSAGES: Record<StatusFilter, { title: string; body: string }> = {
  all: {
    title: "No tasks yet",
    body: "Create your first task to get started.",
  },
  active: {
    title: "No active tasks",
    body: "Everything here is done. Switch to All to see completed work.",
  },
  completed: {
    title: "No completed tasks",
    body: "Complete an active task and it will show up here.",
  },
};

export default function EmptyState({ filter }: { filter: StatusFilter }) {
  const { title, body } = MESSAGES[filter];
  return (
    <div className="empty-state">
      <h2 className="empty-state__title text-headline-xl">{title}</h2>
      <p className="empty-state__body text-body-base">{body}</p>
      {filter !== "completed" && (
        <Link to="/tasks/new" className="btn btn--primary">
          Create task
        </Link>
      )}
    </div>
  );
}
