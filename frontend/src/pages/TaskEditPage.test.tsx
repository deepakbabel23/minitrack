import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import TaskEditPage from "./TaskEditPage";
import { jsonResponse, stubFetchSequence } from "../test/fetchMock";
import type { Task } from "../types";

const TASK: Task = {
  id: 7,
  title: "Old title",
  description: "Keep me",
  priority: "high",
  completed: false,
};

function renderEdit(taskId = "7") {
  return render(
    <MemoryRouter initialEntries={[`/tasks/${taskId}/edit`]}>
      <Routes>
        <Route path="/tasks/:taskId/edit" element={<TaskEditPage />} />
        <Route path="/tasks/:taskId" element={<h1>Detail</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TaskEditPage", () => {
  it("pre-fills every field, which is what makes a full replacement safe", async () => {
    stubFetchSequence(jsonResponse(TASK));
    renderEdit();

    expect(await screen.findByLabelText(/title/i)).toHaveValue("Old title");
    expect(screen.getByLabelText(/description/i)).toHaveValue("Keep me");
    expect(screen.getByLabelText(/priority/i)).toHaveValue("high");
  });

  /*
   * The load-bearing test for the whole edit screen. PATCH binds the same model
   * as POST, so an omitted description would be written as NULL and an omitted
   * priority reset to "medium" — editing the title alone must still send both.
   */
  it("sends a full object on save, so untouched fields survive", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetchSequence(
      jsonResponse(TASK),
      jsonResponse({ ...TASK, title: "New title" }),
    );
    renderEdit();

    const title = await screen.findByLabelText(/title/i);
    await user.clear(title);
    await user.type(title, "New title");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(fetchMock.mock).toHaveBeenCalledTimes(2));

    const [url, init] = fetchMock.callArgs(1);
    expect(init?.method).toBe("PATCH");
    expect(url).toMatch(/\/tasks\/7$/);
    expect(fetchMock.bodyOf(1)).toEqual({
      title: "New title",
      description: "Keep me",
      priority: "high",
    });
    expect(fetchMock.bodyOf(1)).not.toHaveProperty("completed");
  });

  it("returns to the task once it saves", async () => {
    const user = userEvent.setup();
    stubFetchSequence(jsonResponse(TASK), jsonResponse({ ...TASK, title: "New title" }));
    renderEdit();

    await user.clear(await screen.findByLabelText(/title/i));
    await user.type(screen.getByLabelText(/title/i), "New title");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByRole("heading", { name: "Detail" })).toBeInTheDocument();
  });

  it("clears a description the user emptied, rather than sending blank text", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetchSequence(
      jsonResponse(TASK),
      jsonResponse({ ...TASK, description: null }),
    );
    renderEdit();

    await user.clear(await screen.findByLabelText(/description/i));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(fetchMock.mock).toHaveBeenCalledTimes(2));
    expect(fetchMock.bodyOf(1)).toMatchObject({ description: null });
  });

  it("blocks a blank title without spending a request", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetchSequence(jsonResponse(TASK));
    renderEdit();

    await user.clear(await screen.findByLabelText(/title/i));
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    expect(fetchMock.mock).toHaveBeenCalledTimes(1); // the initial load only
  });

  it("renders a 422 detail verbatim, as the string this backend sends", async () => {
    const user = userEvent.setup();
    const detail = "title: String should have at most 200 characters";
    stubFetchSequence(jsonResponse(TASK), jsonResponse({ detail }, { status: 422 }));
    renderEdit();

    await user.clear(await screen.findByLabelText(/title/i));
    await user.type(screen.getByLabelText(/title/i), "Too long");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(detail);
  });

  it("falls back to not-found when the task vanished before the save landed", async () => {
    const user = userEvent.setup();
    stubFetchSequence(
      jsonResponse(TASK),
      jsonResponse({ detail: "Task not found" }, { status: 404 }),
    );
    renderEdit();

    await user.clear(await screen.findByLabelText(/title/i));
    await user.type(screen.getByLabelText(/title/i), "New title");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(await screen.findByRole("heading", { name: /task not found/i })).toBeInTheDocument();
  });
});
