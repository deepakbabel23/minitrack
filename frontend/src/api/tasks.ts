// Typed wrappers for each backend endpoint. Screens call these instead of
// touching fetch — the return types tell you exactly what comes back.
import type { Task, TaskInput } from '../types'
import { request } from './client'

export interface ListTasksParams {
  completed?: boolean
  limit?: number
  offset?: number
}

// Turn a params object into a "?a=1&b=2" string, skipping undefined values.
function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

// Public — no key. Not used to validate a key (it ignores the key); see verifyKey.
export function getHealth(): Promise<{ status: string }> {
  return request<{ status: string }>('/health', { requireAuth: false })
}

// Validate a candidate key before storing it: /tasks is protected, so a 200
// means the key works and a 401 means it doesn't. We ask for just one row.
export async function verifyKey(apiKey: string): Promise<void> {
  await request<Task[]>(`/tasks${buildQuery({ limit: 1 })}`, { apiKey })
}

export function listTasks(params: ListTasksParams = {}): Promise<Task[]> {
  return request<Task[]>(`/tasks${buildQuery({ ...params })}`)
}

export function getTask(id: number): Promise<Task> {
  return request<Task>(`/tasks/${id}`)
}

export function createTask(input: TaskInput): Promise<Task> {
  return request<Task>('/tasks', { method: 'POST', body: input })
}

// PATCH is a FULL replacement on this backend — always pass the complete object.
export function replaceTask(id: number, input: TaskInput): Promise<Task> {
  return request<Task>(`/tasks/${id}`, { method: 'PATCH', body: input })
}

export function completeTask(id: number): Promise<Task> {
  return request<Task>(`/tasks/${id}/complete`, { method: 'POST' })
}

export function deleteTask(id: number): Promise<void> {
  return request<void>(`/tasks/${id}`, { method: 'DELETE' })
}
