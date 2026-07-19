import Button from '../Button/Button'
import styles from './ErrorMessage.module.css'

interface Props {
  message: string
  // Shown small and secondary — troubleshooting info, never the headline.
  requestId?: string | null
  onRetry?: () => void
}

export default function ErrorMessage({ message, requestId, onRetry }: Props) {
  return (
    <div className={styles.wrap} role="alert">
      <p className={styles.message}>{message}</p>
      {requestId && <p className={styles.requestId}>Reference ID: {requestId}</p>}
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className={styles.retry}>
          Try again
        </Button>
      )}
    </div>
  )
}
