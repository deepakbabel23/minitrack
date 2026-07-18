import { Link } from 'react-router-dom'
import styles from './NotFoundPage.module.css'

// The catch-all `*` route. Simple and self-contained, so it's finished now.
export default function NotFoundPage() {
  return (
    <div className={styles.wrap}>
      <p className={styles.code}>404</p>
      <h1 className={styles.heading}>Page not found</h1>
      <p className={styles.message}>
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link to="/tasks" className={styles.button}>
        Back to tasks
      </Link>
    </div>
  )
}
