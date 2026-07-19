import { Navigate, Route, Routes } from "react-router-dom";

import { useApiKey } from "./auth/ApiKeyContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Layout from "./components/Layout";
import ConnectPage from "./pages/ConnectPage";
import NotFoundPage from "./pages/NotFoundPage";
import TaskCreatePage from "./pages/TaskCreatePage";
import TaskDetailPage from "./pages/TaskDetailPage";
import TaskListPage from "./pages/TaskListPage";

/** `/` sends you wherever you can actually go. */
function RootRedirect() {
  const { isConnected } = useApiKey();
  return <Navigate to={isConnected ? "/tasks" : "/connect"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/connect" element={<ConnectPage />} />

        {/* Everything below requires a key in the store. */}
        <Route element={<ProtectedRoute />}>
          <Route path="/tasks" element={<TaskListPage />} />
          <Route path="/tasks/new" element={<TaskCreatePage />} />
          <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
          {/* Act 5 fills this in. */}
          <Route path="/tasks/:taskId/edit" element={<TaskListPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
