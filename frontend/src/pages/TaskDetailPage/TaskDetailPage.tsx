import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Task } from '../../types'
import { getTask, completeTask, deleteTask } from '../../api/tasks'
import { ApiClientError } from '../../api/client'
import { toDisplayError, type DisplayError } from '../../api/errors'
import PriorityBadge from '../../components/PriorityBadge/PriorityBadge'
import StatusBadge from '../../components/StatusBadge/StatusBadge'
import Button from '../../components/Button/Button'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage'
import { useFlash } from '../../hooks/useFlash'
import styles from './TaskDetailPage.module.css'

// A discriminated union models the four screen states cleanly — the compiler
// then makes sure we handle each one and only read `task` when it exists.
type LoadState =
  | { status: 'loading' }
  | { status: 'loaded'; task: Task }
  | { status: 'notfound' }
  | { status: 'error'; message: string; requestId: string | null }

export default function TaskDetailPage() {
  const { taskId } = useParams()
  const id = Number(taskId)
  const navigate = useNavigate()

  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [actionError, setActionError] = useState<DisplayError | null>(null)
  const flash = useFlash()

  useEffect(() => {
    // A non-numeric or bad :taskId can't exist — treat it as not found.
    if (!Number.isInteger(id) || id <= 0) {
      setState({ status: 'notfound' })
      return
    }
    let cancelled = false
    setState({ status: 'loading' })
    getTask(id)
      .then((task) => {
        if (!cancelled) setState({ status: 'loaded', task })
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiClientError && err.status === 404) {
          setState({ status: 'notfound' })
        } else {
          setState({ status: 'error', ...toDisplayError(err) })
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, reloadKey])

  async function handleComplete(task: Task) {
    setBusy(true)
    setActionError(null)
    try {
      const updated = await completeTask(task.id)
      setState({ status: 'loaded', task: updated })
    } catch (err) {
      setActionError(toDisplayError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (state.status !== 'loaded') return
    setBusy(true)
    setActionError(null)
    try {
      await deleteTask(state.task.id)
      navigate('/tasks', { state: { flash: 'Task deleted.' } })
    } catch (err) {
      setActionError(toDisplayError(err))
      setConfirmingDelete(false)
      setBusy(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <Link to="/tasks" className={styles.back}>
        ← Back to tasks
      </Link>

      {flash && (
        <p className={styles.flash} role="status">
          {flash}
        </p>
      )}

      <div aria-live="polite">
        {state.status === 'loading' && <p className={styles.status}>Loading task…</p>}

        {state.status === 'notfound' && (
          <div className={styles.panel}>
            <h1 className={styles.title}>Task not found</h1>
            <p className={styles.muted}>It may have been deleted.</p>
            <Link to="/tasks" className={styles.primaryLink}>
              Back to tasks
            </Link>
          </div>
        )}

        {state.status === 'error' && (
          <ErrorMessage
            message={state.message}
            requestId={state.requestId}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        )}

        {state.status === 'loaded' && (
          <article className={styles.card}>
            <h1 className={styles.title}>{state.task.title}</h1>
            <div className={styles.badges}>
              <PriorityBadge priority={state.task.priority} />
              <StatusBadge completed={state.task.completed} />
            </div>
            {state.task.description ? (
              <p className={styles.description}>{state.task.description}</p>
            ) : (
              <p className={styles.noDescription}>No description.</p>
            )}
            <p className={styles.id}>Task #{state.task.id}</p>

            {actionError && (
              <div className={styles.actionError}>
                <ErrorMessage message={actionError.message} requestId={actionError.requestId} />
              </div>
            )}

            <div className={styles.actions}>
              <Link to={`/tasks/${state.task.id}/edit`} className={styles.editLink}>
                Edit
              </Link>
              {/* Complete only when active — there is no reopen endpoint. */}
              {!state.task.completed && (
                <Button
                  variant="secondary"
                  onClick={() => handleComplete(state.task)}
                  disabled={busy}
                >
                  Complete
                </Button>
              )}
              <Button variant="danger" onClick={() => setConfirmingDelete(true)} disabled={busy}>
                Delete
              </Button>
            </div>
          </article>
        )}
      </div>

      {confirmingDelete && state.status === 'loaded' && (
        <ConfirmDialog
          title="Delete task?"
          message={`"${state.task.title}" will be permanently deleted.`}
          confirmLabel="Delete"
          confirmVariant="danger"
          busy={busy}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}
