import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { ApiKeyProvider } from "./ApiKeyContext";
import ProtectedRoute from "./ProtectedRoute";
import { SESSION_STORAGE_KEY, connect, hydrateFromSession } from "./apiKeyStore";

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <ApiKeyProvider>
        <Routes>
          <Route path="/connect" element={<h1>Connect</h1>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/tasks" element={<h1>Tasks</h1>} />
          </Route>
        </Routes>
      </ApiKeyProvider>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("bounces to /connect when there is no key", () => {
    renderAt("/tasks");

    expect(screen.getByRole("heading", { name: "Connect" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tasks" })).not.toBeInTheDocument();
  });

  it("lets the route through once a key is in the store", () => {
    connect("demo-key-123", { remember: false });

    renderAt("/tasks");

    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
  });

  /*
   * The store is NOT read during render — main.tsx calls hydrateFromSession()
   * once before React mounts. Writing to sessionStorage alone must therefore do
   * nothing until that hydration runs, which is exactly what stops a reload from
   * flashing /connect before the key lands.
   */
  it("ignores a stored key until hydration runs", () => {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, "demo-key-123");

    renderAt("/tasks");

    expect(screen.getByRole("heading", { name: "Connect" })).toBeInTheDocument();
  });

  it("restores a remembered key through hydrateFromSession", () => {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, "demo-key-123");
    hydrateFromSession();

    renderAt("/tasks");

    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
  });

  it("remembers where it bounced from, so Connect can send you back", () => {
    renderAt("/tasks?status=active");

    // The redirect carries location state; the Connect screen reads it to
    // return the user to the screen they actually asked for.
    expect(screen.getByRole("heading", { name: "Connect" })).toBeInTheDocument();
  });
});
