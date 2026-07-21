import { describe, expect, it } from "vitest";

import { EMPTY_TASK_FORM_VALUES, fromTask, toTaskInput } from "./taskFormValues";
import type { Task } from "../types";

const TASK: Task = {
  id: 7,
  title: "Ship the frontend",
  description: "Across eight acts.",
  priority: "high",
  completed: false,
};

describe("fromTask", () => {
  it("carries the editable fields across", () => {
    expect(fromTask(TASK)).toEqual({
      title: "Ship the frontend",
      description: "Across eight acts.",
      priority: "high",
    });
  });

  it("turns a null description into an empty string, because a textarea can't hold null", () => {
    expect(fromTask({ ...TASK, description: null }).description).toBe("");
  });
});

describe("toTaskInput", () => {
  /*
   * This is the full-replacement guarantee. PATCH binds the same model as POST,
   * so an omitted description would be written as NULL and an omitted priority
   * reset to "medium" — a partial payload silently destroys data.
   */
  it("always emits all three fields, even from an empty form", () => {
    expect(Object.keys(toTaskInput(EMPTY_TASK_FORM_VALUES)).sort()).toEqual([
      "description",
      "priority",
      "title",
    ]);
  });

  it("never emits completed or id, which PATCH cannot change anyway", () => {
    const input = toTaskInput({ title: "T", description: "D", priority: "low" });
    expect(input).not.toHaveProperty("completed");
    expect(input).not.toHaveProperty("id");
  });

  it("trims the title", () => {
    expect(toTaskInput({ title: "  Padded  ", description: "", priority: "low" }).title).toBe(
      "Padded",
    );
  });

  it("sends a whitespace-only description as null, not as blank text", () => {
    expect(toTaskInput({ title: "T", description: "   ", priority: "low" }).description).toBeNull();
  });

  it("preserves a real description", () => {
    expect(toTaskInput({ title: "T", description: " Keep me ", priority: "low" }).description).toBe(
      "Keep me",
    );
  });
});
