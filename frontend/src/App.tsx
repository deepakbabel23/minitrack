import { Routes, Route, Navigate } from 'react-router-dom'
import { useApiKey } from './auth/ApiKeyContext'
import ProtectedRoute from './auth/ProtectedRoute'
import Layout from './components/layout/Layout'
import ConnectPage from './pages/ConnectPage/ConnectPage'
import TaskListPage from './pages/TaskListPage/TaskListPage'
import TaskDetailPage from './pages/TaskDetailPage/TaskDetailPage'
import TaskFormPage from './pages/TaskFormPage/TaskFormPage'
import NotFoundPage from './pages/NotFoundPage/NotFoundPage'

// "/" sends connected users to their tasks and everyone else to /connect.
function RootRedirect() {
  const { isConnected } = useApiKey()
  return <Navigate to={isConnected ? '/tasks' : '/connect'} replace />
}

// The route table. The four task routes sit inside <ProtectedRoute>, so they
// redirect to /connect when there's no API key.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/connect" element={<ConnectPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/tasks" element={<TaskListPage />} />
          <Route path="/tasks/new" element={<TaskFormPage mode="create" />} />
          <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
          <Route path="/tasks/:taskId/edit" element={<TaskFormPage mode="edit" />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
