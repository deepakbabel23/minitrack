import styles from './StatusBadge.module.css'

// Completed vs Active, again with text (and a check icon) rather than color alone.
export default function StatusBadge({ completed }: { completed: boolean }) {
  if (completed) {
    return (
      <span className={`${styles.badge} ${styles.completed}`}>
        <span aria-hidden="true">✓</span>
        <span className="sr-only">Status: </span>
        Completed
      </span>
    )
  }
  return (
    <span className={`${styles.badge} ${styles.active}`}>
      <span className="sr-only">Status: </span>
      Active
    </span>
  )
}
