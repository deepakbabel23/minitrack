import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { TaskInput } from '../../types'
import { createTask, getTask, replaceTask } from '../../api/tasks'
import { ApiClientError } from '../../api/client'
import { toDisplayError, type DisplayError } from '../../api/errors'
import TaskForm, { type TaskFormValues } from '../../components/TaskForm/TaskForm'
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage'
import styles from './TaskFormPage.module.css'

interface Props {
  // 'create' powers /tasks/new; 'edit' powers /tasks/:taskId/edit.
  mode: 'create' | 'edit'
}

// Edit must load the existing task before showing the form; create doesn't.
type EditLoad =
  | { status: 'loading' }
  | { status: 'ready'; initial: TaskFormValues }
  | { status: 'notfound' }
  | { status: 'error'; message: string; requestId: string | null }

export default function TaskFormPage({ mode }: Props) {
  const navigate = useNavigate()
  const { taskId } = useParams()
  const id = Number(taskId)

  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<DisplayError | null>(null)
  const [editLoad, setEditLoad] = useState<EditLoad>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  // Load the existing task when editing. A null description becomes an empty
  // string for the textarea; TaskForm turns it back into null on submit.
  useEffect(() => {
    if (mode !== 'edit') return
    if (!Number.isInteger(id) || id <= 0) {
      setEditLoad({ status: 'notfound' })
      return
    }
    let cancelled = false
    setEditLoad({ status: 'loading' })
    getTask(id)
      .then((task) => {
        if (cancelled) return
        setEditLoad({
          status: 'ready',
          initial: {
            title: task.title,
            description: task.description ?? '',
            priority: task.priority,
          },
        })
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiClientError && err.status === 404) {
          setEditLoad({ status: 'notfound' })
        } else {
          setEditLoad({ status: 'error', ...toDisplayError(err) })
        }
      })
    return () => {
      cancelled = true
    }
  }, [mode, id, reloadKey])

  async function submitCreate(values: TaskInput) {
    setSubmitting(true)
    setServerError(null)
    try {
      await createTask(values)
      navigate('/tasks', { state: { flash: 'Task created.' } })
    } catch (err) {
      setServerError(toDisplayError(err))
      setSubmitting(false)
    }
  }

  async function submitEdit(values: TaskInput) {
    setSubmitting(true)
    setServerError(null)
    try {
      // PATCH is a FULL replacement — TaskForm always hands over the whole
      // object, so omitted fields never silently reset on the backend.
      const updated = await replaceTask(id, values)
      navigate(`/tasks/${updated.id}`, { state: { flash: 'Task updated.' } })
    } catch (err) {
      setServerError(toDisplayError(err))
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <Link to="/tasks" className={styles.back}>
        ← Back to tasks
      </Link>
      <h1 className={styles.title}>{mode === 'create' ? 'New task' : 'Edit task'}</h1>

      {mode === 'create' && (
        <TaskForm
          initial={{ title: '', description: '', priority: 'medium' }}
          submitLabel="Save task"
          submitting={submitting}
          serverError={serverError}
          onSubmit={submitCreate}
          onCancel={() => navigate('/tasks')}
        />
      )}

      {mode === 'edit' && (
        <div aria-live="polite">
          {editLoad.status === 'loading' && <p className={styles.status}>Loading task…</p>}
          {editLoad.status === 'notfound' && (
            <p className={styles.status}>
              That task doesn’t exist. <Link to="/tasks">Back to tasks</Link>
            </p>
          )}
          {editLoad.status === 'error' && (
            <ErrorMessage
              message={editLoad.message}
              requestId={editLoad.requestId}
              onRetry={() => setReloadKey((key) => key + 1)}
            />
          )}
          {editLoad.status === 'ready' && (
            <TaskForm
              initial={editLoad.initial}
              submitLabel="Save changes"
              submitting={submitting}
              serverError={serverError}
              onSubmit={submitEdit}
              onCancel={() => navigate(`/tasks/${id}`)}
            />
          )}
        </div>
      )}
    </div>
  )
}
