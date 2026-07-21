import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import TaskCreatePage from "./TaskCreatePage";
import { jsonResponse, stubFetchSequence } from "../test/fetchMock";
import type { Task } from "../types";

const CREATED: Task = {
  id: 12,
  title: "Review pull request",
  description: null,
  priority: "medium",
  completed: false,
};

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={["/tasks/new"]}>
      <Routes>
        <Route path="/tasks/new" element={<TaskCreatePage />} />
        <Route path="/tasks/:taskId" element={<h1>Detail</h1>} />
        <Route path="/tasks" element={<h1>Tasks</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TaskCreatePage", () => {
  it("blocks a whitespace-only title without spending a request", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetchSequence(jsonResponse(CREATED));
    renderCreate();

    await user.type(screen.getByLabelText(/title/i), "   ");
    await user.click(screen.getByRole("button", { name: /save task/i }));

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    expect(fetchMock.mock).not.toHaveBeenCalled();
    // Focus moves to the field that needs fixing, not to the top of the form.
    expect(screen.getByLabelText(/title/i)).toHaveFocus();
  });

  it("POSTs a trimmed title and a null description, then opens the new task", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetchSequence(jsonResponse(CREATED));
    renderCreate();

    await user.type(screen.getByLabelText(/title/i), "  Review pull request  ");
    await user.click(screen.getByRole("button", { name: /save task/i }));

    expect(await screen.findByRole("heading", { name: "Detail" })).toBeInTheDocument();

    const [url, init] = fetchMock.callArgs();
    expect(init?.method).toBe("POST");
    expect(url).toMatch(/\/tasks$/);
    // An untouched description is null, not "" — the same full payload the
    // edit screen sends, built by the same converter.
    expect(fetchMock.bodyOf()).toEqual({
      title: "Review pull request",
      description: null,
      priority: "medium",
    });
  });

  it("sends the description and priority the user chose", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetchSequence(
      jsonResponse({ ...CREATED, description: "With detail", priority: "high" }),
    );
    renderCreate();

    await user.type(screen.getByLabelText(/title/i), "Review pull request");
    await user.type(screen.getByLabelText(/description/i), "With detail");
    await user.selectOptions(screen.getByLabelText(/priority/i), "high");
    await user.click(screen.getByRole("button", { name: /save task/i }));

    await waitFor(() => expect(fetchMock.mock).toHaveBeenCalledTimes(1));
    expect(fetchMock.bodyOf()).toEqual({
      title: "Review pull request",
      description: "With detail",
      priority: "high",
    });
  });

  it("renders a 422 detail verbatim, as the string this backend sends", async () => {
    const user = userEvent.setup();
    const detail = "title: String should have at most 200 characters";
    stubFetchSequence(jsonResponse({ detail }, { status: 422 }));
    renderCreate();

    await user.type(screen.getByLabelText(/title/i), "Too long");
    await user.click(screen.getByRole("button", { name: /save task/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(detail);
    // The form stays put with the user's input intact.
    expect(screen.getByLabelText(/title/i)).toHaveValue("Too long");
  });

  it("never puts completed on the wire, since the backend sets it", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetchSequence(jsonResponse(CREATED));
    renderCreate();

    await user.type(screen.getByLabelText(/title/i), "Review pull request");
    await user.click(screen.getByRole("button", { name: /save task/i }));

    await waitFor(() => expect(fetchMock.mock).toHaveBeenCalledTimes(1));
    expect(fetchMock.bodyOf()).not.toHaveProperty("completed");
  });
});
