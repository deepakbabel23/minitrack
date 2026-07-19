/** Completed / Active. Icon + text, never colour alone. */
export default function StatusBadge({ completed }: { completed: boolean }) {
  if (completed) {
    return (
      <span className="badge badge--status-completed">
        <span className="badge__icon" aria-hidden="true">
          ✓
        </span>
        Completed
      </span>
    );
  }
  return <span className="badge badge--status-active">Active</span>;
}
