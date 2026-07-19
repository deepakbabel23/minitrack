import { Link } from 'react-router-dom'
import type { Task } from '../../types'
import PriorityBadge from '../PriorityBadge/PriorityBadge'
import StatusBadge from '../StatusBadge/StatusBadge'
import Button from '../Button/Button'
import styles from './TaskCard.module.css'

interface Props {
  task: Task
  busy: boolean
  onComplete: (task: Task) => void
  onDelete: (task: Task) => void
}

// One task in the list. Presentational: it renders what it's given and calls
// back on Complete/Delete rather than talking to the API itself.
export default function TaskCard({ task, busy, onComplete, onDelete }: Props) {
  return (
    <article className={styles.card}>
      <div className={styles.body}>
        <h2 className={styles.title}>
          <Link to={`/tasks/${task.id}`}>{task.title}</Link>
        </h2>
        {task.description && <p className={styles.desc}>{task.description}</p>}
        <div className={styles.badges}>
          <PriorityBadge priority={task.priority} />
          <StatusBadge completed={task.completed} />
        </div>
      </div>

      <div className={styles.actions}>
        <Link to={`/tasks/${task.id}`} className={styles.linkBtn}>
          View
        </Link>
        <Link to={`/tasks/${task.id}/edit`} className={styles.linkBtn}>
          Edit
        </Link>
        {!task.completed && (
          <Button variant="secondary" onClick={() => onComplete(task)} disabled={busy}>
            Complete
          </Button>
        )}
        <Button
          variant="ghost"
          className={styles.deleteBtn}
          onClick={() => onDelete(task)}
          disabled={busy}
        >
          Delete
        </Button>
      </div>
    </article>
  )
}
