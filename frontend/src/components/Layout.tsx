import { Outlet } from "react-router-dom";

import AppHeader from "./AppHeader";

/** App chrome shared by every route. */
export default function Layout() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <AppHeader />
      <main id="main" className="page">
        <Outlet />
      </main>
    </>
  );
}
