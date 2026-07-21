import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import ConnectPage from "./ConnectPage";
import { getApiBaseUrl } from "../api/client";
import { ApiKeyProvider } from "../auth/ApiKeyContext";
import { SESSION_STORAGE_KEY, getKey } from "../auth/apiKeyStore";
import { jsonResponse, stubFetchSequence } from "../test/fetchMock";

function renderConnectPage() {
  return render(
    <MemoryRouter initialEntries={["/connect"]}>
      <ApiKeyProvider>
        <Routes>
          <Route path="/connect" element={<ConnectPage />} />
          <Route path="/tasks" element={<h1>Tasks</h1>} />
        </Routes>
      </ApiKeyProvider>
    </MemoryRouter>,
  );
}

function keyField() {
  return screen.getByLabelText(/api key/i);
}

function submitButton() {
  return screen.getByRole("button", { name: /connect to minitrack/i });
}

describe("ConnectPage", () => {
  it("validates the candidate key against GET /tasks", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetchSequence(jsonResponse([]));
    renderConnectPage();

    await user.type(keyField(), "demo-key-123");
    await user.click(submitButton());

    expect(await screen.findByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(fetchMock.callArgs()[0]).toBe(`${getApiBaseUrl()}/tasks?limit=1`);
  });

  it("connects and moves on when the key is accepted", async () => {
    const user = userEvent.setup();
    stubFetchSequence(jsonResponse([]));
    renderConnectPage();

    await user.type(keyField(), "demo-key-123");
    await user.click(submitButton());

    expect(await screen.findByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(getKey()).toBe("demo-key-123");
  });

  it("reports a rejected key and stays put", async () => {
    const user = userEvent.setup();
    stubFetchSequence(jsonResponse({ detail: "Invalid or missing API key." }, { status: 401 }));
    renderConnectPage();

    await user.type(keyField(), "wrong-key");
    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("That API key was rejected.");
    // No redirect loop, and no session torn down on a candidate that never worked.
    expect(screen.queryByRole("heading", { name: "Tasks" })).not.toBeInTheDocument();
    expect(getKey()).toBeNull();
  });

  it("surfaces the server's own message when the failure isn't a 401", async () => {
    const user = userEvent.setup();
    stubFetchSequence(jsonResponse({ detail: "ignored" }, { status: 500 }));
    renderConnectPage();

    await user.type(keyField(), "demo-key-123");
    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(/server had a problem/i);
  });

  /*
   * The key is held in memory by default. Persisting it is opt-in, having been
   * shown the trade-off — so the default path must leave storage untouched.
   */
  it("keeps the key out of sessionStorage unless the user opts in", async () => {
    const user = userEvent.setup();
    stubFetchSequence(jsonResponse([]));
    renderConnectPage();

    await user.type(keyField(), "demo-key-123");
    await user.click(submitButton());

    await screen.findByRole("heading", { name: "Tasks" });
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("persists the key only when Remember is checked", async () => {
    const user = userEvent.setup();
    stubFetchSequence(jsonResponse([]));
    renderConnectPage();

    await user.type(keyField(), "demo-key-123");
    await user.click(screen.getByLabelText(/remember for this session/i));
    await user.click(submitButton());

    await screen.findByRole("heading", { name: "Tasks" });
    expect(window.sessionStorage.getItem(SESSION_STORAGE_KEY)).toBe("demo-key-123");
  });

  it("blocks submission until a key is typed", () => {
    stubFetchSequence(jsonResponse([]));
    renderConnectPage();

    expect(submitButton()).toBeDisabled();
  });

  it("trims the pasted key before validating or storing it", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetchSequence(jsonResponse([]));
    renderConnectPage();

    // Copying a key out of a terminal or a doc routinely brings whitespace with
    // it; the trailing space must not become part of the header.
    await user.type(keyField(), "  demo-key-123  ");
    await user.click(submitButton());

    await screen.findByRole("heading", { name: "Tasks" });
    expect(fetchMock.headerOf("X-API-Key")).toBe("demo-key-123");
    expect(getKey()).toBe("demo-key-123");
  });

  it("hides the key by default and reveals it on request", async () => {
    const user = userEvent.setup();
    stubFetchSequence(jsonResponse([]));
    renderConnectPage();

    // A password field by default, so the key isn't shoulder-surfable — but
    // revealable, because a mistyped key is otherwise impossible to spot.
    expect(keyField()).toHaveAttribute("type", "password");

    const toggle = screen.getByRole("button", { name: /show/i });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);

    expect(keyField()).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: /hide/i })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: /hide/i }));

    expect(keyField()).toHaveAttribute("type", "password");
  });
});
