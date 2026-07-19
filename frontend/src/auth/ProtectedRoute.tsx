import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useApiKey } from "./ApiKeyContext";

/**
 * Gate for every /tasks* route.
 *
 * This is also the Act 6 redirect mechanism: a mid-session 401 clears the store,
 * the context re-renders, `isConnected` flips false, and this sends the user to
 * /connect. No router instance is needed outside React.
 */
export default function ProtectedRoute() {
  const { isConnected } = useApiKey();
  const location = useLocation();

  if (!isConnected) {
    return <Navigate to="/connect" state={{ from: location.pathname + location.search }} replace />;
  }

  return <Outlet />;
}
