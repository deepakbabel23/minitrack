import { useRef, useState, type FormEvent } from 'react'
import type { Priority, TaskInput } from '../../types'
import FormField from '../FormField/FormField'
import Button from '../Button/Button'
import ErrorMessage from '../ErrorMessage/ErrorMessage'
import styles from './TaskForm.module.css'

export interface TaskFormValues {
  title: string
  description: string
  priority: Priority
}

interface Props {
  initial: TaskFormValues
  submitLabel: string
  submitting: boolean
  serverError?: { message: string; requestId: string | null } | null
  onSubmit: (values: TaskInput) => void
  onCancel: () => void
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high']

// Shared by both Create and Edit. It owns the field values and client-side
// validation, and hands a complete TaskInput to onSubmit. It builds the WHOLE
// object every time — required because PATCH is a full replacement on the API.
export default function TaskForm({
  initial,
  submitLabel,
  submitting,
  serverError,
  onSubmit,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [priority, setPriority] = useState<Priority>(initial.priority)
  const [titleError, setTitleError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    // Match the backend: trim the title and reject a whitespace-only one before
    // making any request.
    const trimmed = title.trim()
    if (!trimmed) {
      setTitleError('Title is required.')
      titleRef.current?.focus()
      return
    }
    setTitleError(null)
    onSubmit({
      title: trimmed,
      description: description.trim() ? description : null,
      priority,
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className={styles.form}>
      {serverError && (
        <div className={styles.serverError}>
          <ErrorMessage message={serverError.message} requestId={serverError.requestId} />
        </div>
      )}

      <FormField label="Title" htmlFor="title" required error={titleError ?? undefined}>
        <input
          ref={titleRef}
          id="title"
          className={styles.control}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? 'title-error' : undefined}
        />
      </FormField>

      <FormField label="Description" htmlFor="description" hint="Optional">
        <textarea
          id="description"
          className={styles.control}
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </FormField>

      <FormField label="Priority" htmlFor="priority">
        <select
          id="priority"
          className={styles.control}
          value={priority}
          onChange={(event) => setPriority(event.target.value as Priority)}
        >
          {PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {value[0].toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
      </FormField>

      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        {/* `loading` disables the button too, preventing a double submit. */}
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
