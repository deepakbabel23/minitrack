import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import TaskListPage from "./TaskListPage";
import { PAGE_SIZE } from "../api/tasks";
import {
  jsonResponse,
  noContentResponse,
  stubFetchSequence,
  stubFetchWith,
} from "../test/fetchMock";
import type { Task } from "../types";

function makeTasks(count: number, startId = 1): Task[] {
  return Array.from(
    { length: count },
    (_, index): Task => ({
      id: startId + index,
      title: `Task ${startId + index}`,
      description: null,
      priority: "medium",
      completed: false,
    }),
  );
}

function renderList() {
  return render(
    <MemoryRouter initialEntries={["/tasks"]}>
      <TaskListPage />
    </MemoryRouter>,
  );
}

describe("Load more", () => {
  /*
   * GET /tasks returns a bare array with no total, so a short page is the ONLY
   * signal that there is nothing more to fetch.
   */
  it("stays hidden when the first page is short", async () => {
    stubFetchSequence(jsonResponse(makeTasks(3)));
    renderList();

    expect(await screen.findByText("Task 1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });

  it("appears on a full page and appends the next one", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetchSequence(
      jsonResponse(makeTasks(PAGE_SIZE)),
      jsonResponse(makeTasks(5, PAGE_SIZE + 1)),
    );
    renderList();

    await user.click(await screen.findByRole("button", { name: /load more/i }));

    expect(await screen.findByText(`Task ${PAGE_SIZE + 5}`)).toBeInTheDocument();
    // The first page is still on screen — this appends, it doesn't replace.
    expect(screen.getByText("Task 1")).toBeInTheDocument();
    expect(fetchMock.callArgs(1)[0]).toContain(`offset=${PAGE_SIZE}`);
    // The second page was short, so there is nothing left to load.
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });

  it("resets pagination when the filter changes", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetchWith((url) => {
      if (url.includes("completed=false")) return jsonResponse(makeTasks(2, 100));
      if (url.includes(`offset=${PAGE_SIZE}`)) return jsonResponse(makeTasks(5, PAGE_SIZE + 1));
      return jsonResponse(makeTasks(PAGE_SIZE));
    });
    renderList();

    // Walk to page two first, so a failure to reset would be visible as a
    // request for offset=25 rather than offset=0.
    await user.click(await screen.findByRole("button", { name: /load more/i }));
    await screen.findByText(`Task ${PAGE_SIZE + 5}`);

    await user.click(screen.getByRole("button", { name: "Active" }));

    expect(await screen.findByText("Task 100")).toBeInTheDocument();
    expect(screen.queryByText("Task 1")).not.toBeInTheDocument();

    const calls = fetchMock.mock.mock.calls;
    const lastUrl = fetchMock.callArgs(calls.length - 1)[0];
    expect(lastUrl).toContain("completed=false");
    expect(lastUrl).toContain("offset=0");
  });
});

describe("the task rows", () => {
  it("offers no Complete button on an already-completed task", async () => {
    stubFetchSequence(
      jsonResponse([
        { id: 1, title: "Already done", description: null, priority: "low", completed: true },
      ]),
    );
    renderList();

    const card = await screen.findByRole("article");
    expect(within(card).getByText("Already done")).toBeInTheDocument();
    // Completion is a one-way door: no Complete, and certainly no Reopen.
    expect(within(card).queryByRole("button", { name: /^complete$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reopen/i })).not.toBeInTheDocument();
  });

  it("marks a task complete in place", async () => {
    const user = userEvent.setup();
    stubFetchWith((url, init) => {
      if (init?.method === "POST" && url.endsWith("/complete")) {
        return jsonResponse({
          id: 1,
          title: "Task 1",
          description: null,
          priority: "medium",
          completed: true,
        });
      }
      return jsonResponse(makeTasks(1));
    });
    renderList();

    const card = await screen.findByRole("article");
    await user.click(within(card).getByRole("button", { name: /^complete$/i }));

    // The row stays put and its Complete button disappears.
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /^complete$/i })).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Task 1")).toBeInTheDocument();
  });

  /*
   * The live region is mounted from the first render and only its contents
   * change. If it ever starts mounting together with its text, screen readers
   * routinely skip the announcement — and nothing visual would look wrong.
   */
  it("announces the completion in a live region that was already mounted", async () => {
    const user = userEvent.setup();
    stubFetchWith((url, init) => {
      if (init?.method === "POST" && url.endsWith("/complete")) {
        return jsonResponse({
          id: 1,
          title: "Task 1",
          description: null,
          priority: "medium",
          completed: true,
        });
      }
      return jsonResponse(makeTasks(1));
    });
    renderList();

    await screen.findByRole("article");
    const liveRegion = document.querySelector(".flash-region");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toBeEmptyDOMElement();

    await user.click(screen.getByRole("button", { name: /^complete$/i }));

    // Same node, now filled in — not a newly mounted region.
    await waitFor(() => expect(liveRegion).toHaveTextContent(/marked complete/i));
    expect(document.querySelector(".flash-region")).toBe(liveRegion);
  });
});

describe("deleting", () => {
  /*
   * Exercises the native <dialog> path, which needs the jsdom polyfill in
   * setupTests — without it showModal() throws and this test is the canary.
   */
  it("asks for confirmation, then drops the row", async () => {
    const user = userEvent.setup();
    stubFetchWith((_url, init) => {
      if (init?.method === "DELETE") return noContentResponse();
      return jsonResponse(makeTasks(2));
    });
    renderList();

    const firstCard = (await screen.findAllByRole("article"))[0];
    await user.click(within(firstCard).getByRole("button", { name: /delete/i }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/permanently removed/i);

    await user.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(screen.queryByText("Task 1")).not.toBeInTheDocument());
    expect(screen.getByText("Task 2")).toBeInTheDocument();
  });

  it("leaves the row alone when the dialog is cancelled", async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetchWith(() => jsonResponse(makeTasks(2)));
    renderList();

    const firstCard = (await screen.findAllByRole("article"))[0];
    await user.click(within(firstCard).getByRole("button", { name: /delete/i }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));

    expect(screen.getByText("Task 1")).toBeInTheDocument();
    expect(fetchMock.mock.mock.calls.every(([, init]) => init?.method !== "DELETE")).toBe(true);
  });
});

describe("failure handling", () => {
  it("shows the error with a retry rather than an empty list", async () => {
    stubFetchSequence(jsonResponse({ detail: "Task not found" }, { status: 500 }));
    renderList();

    expect(await screen.findByText(/server had a problem/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
