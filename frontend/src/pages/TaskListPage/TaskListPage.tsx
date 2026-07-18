import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Task } from '../../types'
import { listTasks, completeTask, deleteTask } from '../../api/tasks'
import { ApiClientError } from '../../api/client'
import TaskCard from '../../components/TaskCard/TaskCard'
import ErrorMessage from '../../components/ErrorMessage/ErrorMessage'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'
import Button from '../../components/Button/Button'
import styles from './TaskListPage.module.css'

// One fixed page size. The backend returns no total count, so we page with
// "Load more" (bump the offset) rather than numbered pages.
const PAGE_SIZE = 20

type StatusFilter = 'all' | 'active' | 'completed'
const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

// Map our filter to the backend's `completed` query param (absent = all).
function completedParam(status: StatusFilter): boolean | undefined {
  if (status === 'active') return false
  if (status === 'completed') return true
  return undefined
}

interface LoadError {
  message: string
  requestId: string | null
}
function toLoadError(err: unknown): LoadError {
  if (err instanceof ApiClientError) return { message: err.detail, requestId: err.requestId }
  return { message: 'Something went wrong. Please try again.', requestId: null }
}

const EMPTY_MESSAGE: Record<StatusFilter, string> = {
  all: 'No tasks yet. Create your first one.',
  active: 'No active tasks — everything is done!',
  completed: 'No completed tasks yet.',
}

export default function TaskListPage() {
  // Filter lives in the URL (?status=active), so the view is shareable and the
  // back button works.
  const [searchParams, setSearchParams] = useSearchParams()
  const rawStatus = searchParams.get('status')
  const status: StatusFilter =
    rawStatus === 'active' || rawStatus === 'completed' ? rawStatus : 'all'

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<LoadError | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null)
  // Bumping this forces the loader to re-run (used by the "Try again" button,
  // where the filter itself hasn't changed).
  const [reloadKey, setReloadKey] = useState(0)

  // Load the first page whenever the filter changes — this resets pagination.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    listTasks({ completed: completedParam(status), limit: PAGE_SIZE, offset: 0 })
      .then((data) => {
        if (cancelled) return
        setTasks(data)
        setHasMore(data.length === PAGE_SIZE)
      })
      .catch((err) => {
        if (!cancelled) setError(toLoadError(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [status, reloadKey])

  async function loadMore() {
    setLoadingMore(true)
    setError(null)
    try {
      const data = await listTasks({
        completed: completedParam(status),
        limit: PAGE_SIZE,
        offset: tasks.length,
      })
      setTasks((prev) => [...prev, ...data])
      // A short page means there's nothing left — hide "Load more".
      setHasMore(data.length === PAGE_SIZE)
    } catch (err) {
      setError(toLoadError(err))
    } finally {
      setLoadingMore(false)
    }
  }

  function changeFilter(next: StatusFilter) {
    setSearchParams(next === 'all' ? {} : { status: next }, { replace: true })
  }

  async function handleComplete(task: Task) {
    setBusyId(task.id)
    setError(null)
    try {
      const updated = await completeTask(task.id)
      setTasks((prev) =>
        prev
          .map((item) => (item.id === updated.id ? updated : item))
          // A completed task no longer belongs in the "Active" view.
          .filter((item) => (status === 'active' ? !item.completed : true)),
      )
    } catch (err) {
      setError(toLoadError(err))
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    const target = pendingDelete
    setBusyId(target.id)
    setError(null)
    try {
      await deleteTask(target.id)
      setTasks((prev) => prev.filter((item) => item.id !== target.id))
      setPendingDelete(null)
    } catch (err) {
      setError(toLoadError(err))
      setPendingDelete(null)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tasks</h1>
          <p className={styles.subtitle}>Track and manage your work.</p>
        </div>
        <Link to="/tasks/new" className={styles.createBtn}>
          Create task
        </Link>
      </div>

      <div className={styles.filters} role="group" aria-label="Filter tasks">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`${styles.filter} ${status === filter.value ? styles.filterActive : ''}`}
            aria-pressed={status === filter.value}
            onClick={() => changeFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* aria-live lets a screen reader announce load results and errors. */}
      <div aria-live="polite">
        {loading ? (
          <p className={styles.status}>Loading tasks…</p>
        ) : error && tasks.length === 0 ? (
          <ErrorMessage
            message={error.message}
            requestId={error.requestId}
            onRetry={() => setReloadKey((key) => key + 1)}
          />
        ) : tasks.length === 0 ? (
          <p className={styles.empty}>{EMPTY_MESSAGE[status]}</p>
        ) : (
          <>
            {/* A non-blocking error from an action (complete/delete/load more). */}
            {error && (
              <div className={styles.inlineError}>
                <ErrorMessage message={error.message} requestId={error.requestId} />
              </div>
            )}
            <ul className={styles.list}>
              {tasks.map((task) => (
                <li key={task.id}>
                  <TaskCard
                    task={task}
                    busy={busyId === task.id}
                    onComplete={handleComplete}
                    onDelete={setPendingDelete}
                  />
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className={styles.loadMore}>
                <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete task?"
          message={`"${pendingDelete.title}" will be permanently deleted.`}
          confirmLabel="Delete"
          confirmVariant="danger"
          busy={busyId === pendingDelete.id}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
