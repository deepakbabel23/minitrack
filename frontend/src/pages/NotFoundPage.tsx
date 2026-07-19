import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="stack" style={{ textAlign: "center", paddingBlock: "var(--space-10)" }}>
      <p className="text-headline-3xl" style={{ margin: 0, color: "var(--color-primary)" }}>
        404
      </p>
      <h1 className="text-headline-2xl" style={{ margin: 0 }}>
        Page not found
      </h1>
      <p className="text-body-base text-muted" style={{ margin: 0 }}>
        That route doesn&rsquo;t exist in MiniTrack.
      </p>
      <div>
        <Link to="/tasks" className="btn btn--primary">
          Back to tasks
        </Link>
      </div>
    </div>
  );
}
