// The data contract shared by every screen. These mirror the FastAPI backend
// exactly (see frontend/spec.md "Data contract"). No invented fields.

export type Priority = 'low' | 'medium' | 'high'

export interface Task {
  id: number
  title: string
  description: string | null
  priority: Priority
  completed: boolean
}

// The body sent to POST /tasks and PATCH /tasks/{id}. The backend calls its
// version `TaskIn`; this is our local name. `completed` and `id` are never sent.
export interface TaskInput {
  title: string
  description: string | null
  priority: Priority
}

// The JSON body of a 4xx error. IMPORTANT: `detail` is a plain string (the
// backend joins validation errors into one string), never an array. `request_id`
// is present on 404/422 but absent on 401 — hence optional.
export interface ApiError {
  detail: string
  request_id?: string | null
}
