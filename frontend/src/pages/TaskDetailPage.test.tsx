import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import TaskDetailPage from "./TaskDetailPage";
import { jsonResponse, stubFetchNetworkError, stubFetchSequence } from "../test/fetchMock";
import type { Task } from "../types";

const TASK: Task = {
  id: 7,
  title: "Ship the frontend",
  description: "Across eight acts.",
  priority: "high",
  completed: false,
};

function renderDetail(taskId: string) {
  return render(
    <MemoryRouter initialEntries={[`/tasks/${taskId}`]}>
      <Routes>
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
        <Route path="/tasks" element={<h1>Tasks</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The task panel, so queries don't collide with the always-mounted dialog. */
function panel() {
  return screen.getByRole("article");
}

describe("TaskDetailPage", () => {
  it("renders the task", async () => {
    stubFetchSequence(jsonResponse(TASK));
    renderDetail("7");

    expect(await screen.findByRole("heading", { name: "Ship the frontend" })).toBeInTheDocument();
    expect(screen.getByText("Across eight acts.")).toBeInTheDocument();
  });

  /*
   * The backend has no un-complete endpoint and PATCH cannot touch `completed`,
   * so a Reopen affordance would promise something the API cannot deliver.
   */
  it("offers no Reopen on a completed task, and no Complete either", async () => {
    stubFetchSequence(jsonResponse({ ...TASK, completed: true }));
    renderDetail("7");

    await screen.findByRole("heading", { name: "Ship the frontend" });

    expect(screen.queryByRole("button", { name: /reopen/i })).not.toBeInTheDocument();
    expect(within(panel()).queryByRole("button", { name: /^complete$/i })).not.toBeInTheDocument();
    // Delete is still available — completion is one-way, not permanent.
    expect(within(panel()).getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
  });

  it("offers Complete while the task is still active", async () => {
    stubFetchSequence(jsonResponse(TASK));
    renderDetail("7");

    await screen.findByRole("heading", { name: "Ship the frontend" });

    expect(within(panel()).getByRole("button", { name: /^complete$/i })).toBeInTheDocument();
  });

  it("treats an unknown id as not-found rather than an error", async () => {
    stubFetchSequence(jsonResponse({ detail: "Task not found" }, { status: 404 }));
    renderDetail("999999");

    expect(await screen.findByRole("heading", { name: /task not found/i })).toBeInTheDocument();
    expect(screen.getByText(/#999999/)).toBeInTheDocument();
  });

  it("never spends a request on an id that cannot exist", async () => {
    const fetchMock = stubFetchSequence(jsonResponse(TASK));
    renderDetail("not-a-number");

    expect(await screen.findByRole("heading", { name: /task not found/i })).toBeInTheDocument();
    expect(fetchMock.mock).not.toHaveBeenCalled();
  });

  it("distinguishes a transport failure from a missing task", async () => {
    stubFetchNetworkError();
    renderDetail("7");

    // An unreachable server is an error with a retry, not "this task is gone".
    expect(await screen.findByText(/can't reach the minitrack server/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /task not found/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
