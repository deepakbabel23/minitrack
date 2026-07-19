import type { ReactNode } from 'react'
import styles from './FormField.module.css'

interface Props {
  label: string
  // Must match the id of the control passed as children, so clicking the label
  // focuses the control and screen readers announce them together.
  htmlFor: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
}

// A label + control + optional hint/error wrapper. The control (input, textarea,
// or select) is passed as children so this one component serves every field type.
export default function FormField({ label, htmlFor, required, hint, error, children }: Props) {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor} className={styles.label}>
        {label}
        {required && (
          <span className={styles.required} aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {hint && <p className={styles.hint}>{hint}</p>}
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
