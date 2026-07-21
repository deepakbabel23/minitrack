import { describe, expect, it } from "vitest";

import { parseStatusParam, statusToCompleted } from "./useStatusFilter";

describe("parseStatusParam", () => {
  it("reads the two real filters", () => {
    expect(parseStatusParam("active")).toBe("active");
    expect(parseStatusParam("completed")).toBe("completed");
  });

  it("falls back to all for an absent or junk param", () => {
    expect(parseStatusParam(null)).toBe("all");
    expect(parseStatusParam("")).toBe("all");
    expect(parseStatusParam("archived")).toBe("all");
  });
});

describe("statusToCompleted", () => {
  it("maps the filter onto the query param the backend understands", () => {
    expect(statusToCompleted("active")).toBe(false);
    expect(statusToCompleted("completed")).toBe(true);
  });

  /*
   * Not `false`, and not the string "all" — `undefined` is what makes
   * serializeQuery drop the param entirely, which is how "everything" is
   * expressed on the wire.
   */
  it("sends no completed param at all for the default filter", () => {
    expect(statusToCompleted("all")).toBeUndefined();
  });
});
