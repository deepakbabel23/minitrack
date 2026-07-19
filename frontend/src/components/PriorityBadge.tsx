import type { Priority } from "../types";

/**
 * Priority is never conveyed by colour alone — every badge carries a geometric
 * icon and a text label, per DESIGN.md ▸ Badges.
 */
const PRIORITY_META: Record<Priority, { icon: string; label: string; className: string }> = {
  high: { icon: "▲", label: "High", className: "badge--priority-high" },
  medium: { icon: "●", label: "Medium", className: "badge--priority-medium" },
  low: { icon: "▼", label: "Low", className: "badge--priority-low" },
};

export default function PriorityBadge({ priority }: { priority: Priority }) {
  const { icon, label, className } = PRIORITY_META[priority];
  return (
    <span className={`badge ${className}`}>
      <span className="badge__icon" aria-hidden="true">
        {icon}
      </span>
      {label} priority
    </span>
  );
}
