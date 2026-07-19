import type { Priority } from '../../types'
import styles from './PriorityBadge.module.css'

// Priority is conveyed by an icon AND a text label, never color alone (an
// accessibility requirement). The sr-only prefix gives screen-reader users the
// word "Priority:" so "High" isn't ambiguous.
const PRIORITY_META: Record<Priority, { label: string; icon: string; cls: string }> = {
  high: { label: 'High', icon: '▲', cls: styles.high },
  medium: { label: 'Medium', icon: '●', cls: styles.medium },
  low: { label: 'Low', icon: '▼', cls: styles.low },
}

export default function PriorityBadge({ priority }: { priority: Priority }) {
  const meta = PRIORITY_META[priority]
  return (
    <span className={`${styles.badge} ${meta.cls}`}>
      <span aria-hidden="true">{meta.icon}</span>
      <span className="sr-only">Priority: </span>
      {meta.label}
    </span>
  )
}
