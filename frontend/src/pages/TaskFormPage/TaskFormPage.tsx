import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { TaskInput } from '../../types'
import { createTask } from '../../api/tasks'
import { ApiClientError } from '../../api/client'
import TaskForm from '../../components/TaskForm/TaskForm'
import styles from './TaskFormPage.module.css'

interface Props {
  // 'create' powers /tasks/new; 'edit' powers /tasks/:taskId/edit. The edit
  // path is wired up in the next slice.
  mode: 'create' | 'edit'
}

interface ServerError {
  message: string
  requestId: string | null
}
function toServerError(err: unknown): ServerError {
  if (err instanceof ApiClientError) return { message: err.detail, requestId: err.requestId }
  return { message: 'Something went wrong. Please try again.', requestId: null }
}

export default function TaskFormPage({ mode }: Props) {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<ServerError | null>(null)

  if (mode === 'edit') {
    return <p>Editing is built in the next step.</p>
  }

  async function handleCreate(values: TaskInput) {
    setSubmitting(true)
    setServerError(null)
    try {
      await createTask(values)
      // Land on the list, where the new task is visible, with a confirmation.
      navigate('/tasks', { state: { flash: 'Task created.' } })
    } catch (err) {
      // A 422 arrives here; its `detail` string is shown at the top of the form.
      setServerError(toServerError(err))
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <Link to="/tasks" className={styles.back}>
        ← Back to tasks
      </Link>
      <h1 className={styles.title}>New task</h1>
      <TaskForm
        initial={{ title: '', description: '', priority: 'medium' }}
        submitLabel="Save task"
        submitting={submitting}
        serverError={serverError}
        onSubmit={handleCreate}
        onCancel={() => navigate('/tasks')}
      />
    </div>
  )
}
