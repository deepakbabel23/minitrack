import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import EmptyState from "./EmptyState";
import type { StatusFilter } from "../types";

function renderEmptyState(filter: StatusFilter) {
  return render(
    <MemoryRouter>
      <EmptyState filter={filter} />
    </MemoryRouter>,
  );
}

describe("EmptyState", () => {
  /*
   * "No tasks yet" is actively wrong when a filter is on — it reads as "your
   * data is gone" rather than "this view is empty". Each filter gets its own
   * wording.
   */
  it("says the list is empty when no filter is applied", () => {
    renderEmptyState("all");

    expect(screen.getByRole("heading", { name: "No tasks yet" })).toBeInTheDocument();
  });

  it("explains an empty Active view as everything being done", () => {
    renderEmptyState("active");

    expect(screen.getByRole("heading", { name: "No active tasks" })).toBeInTheDocument();
    expect(screen.getByText(/switch to all/i)).toBeInTheDocument();
  });

  it("explains an empty Completed view without implying data loss", () => {
    renderEmptyState("completed");

    expect(screen.getByRole("heading", { name: "No completed tasks" })).toBeInTheDocument();
  });

  it("offers Create task on the views where creating one would show up", () => {
    renderEmptyState("all");
    expect(screen.getByRole("link", { name: /create task/i })).toBeInTheDocument();
  });

  /*
   * A task cannot be created already-completed, so the new task would not
   * appear in this view — offering the action here would look broken.
   */
  it("withholds Create task on the Completed view", () => {
    renderEmptyState("completed");

    expect(screen.queryByRole("link", { name: /create task/i })).not.toBeInTheDocument();
  });
});
