import { useEffect, useRef } from 'react'
import Button from '../Button/Button'
import styles from './ConfirmDialog.module.css'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  confirmVariant?: 'primary' | 'danger'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Uses the native <dialog> element via showModal(), which gives us three
// accessibility behaviors for free: focus is trapped inside the dialog, Esc
// closes it, and focus returns to whatever was focused before it opened.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="confirmTitle"
      // The native Esc key fires a "cancel" event — route it to onCancel.
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
      // Clicking the backdrop (the dialog element itself, outside its content).
      onClick={(event) => {
        if (event.target === ref.current) onCancel()
      }}
    >
      <h2 id="confirmTitle" className={styles.title}>
        {title}
      </h2>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant={confirmVariant} onClick={onConfirm} loading={busy}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
