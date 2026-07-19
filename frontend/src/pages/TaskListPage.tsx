import { Link } from "react-router-dom";

/**
 * Act 1 stub. The real list screen — filters, Load more, complete and delete —
 * arrives in Act 2. This exists so the router, ProtectedRoute and Layout can be
 * exercised end to end against the live backend.
 */
export default function TaskListPage() {
  return (
    <div className="stack stack--loose">
      <div className="row row--between">
        <h1 className="text-headline-3xl" style={{ margin: 0 }}>
          Tasks
        </h1>
        <Link to="/tasks/new" className="btn btn--primary">
          Create task
        </Link>
      </div>

      <div className="panel">
        <p className="text-body-base text-muted" style={{ margin: 0 }}>
          Connected. The task list renders here in Act 2.
        </p>
      </div>
    </div>
  );
}
