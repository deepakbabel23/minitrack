import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import type { StatusFilter } from "../types";

/**
 * The filter lives in the URL so it survives reload, is shareable, and works
 * with the back button. Pure helpers are exported separately so they can be
 * tested without mounting a router.
 */

/** Unknown or absent → "all". */
export function parseStatusParam(raw: string | null): StatusFilter {
  return raw === "active" || raw === "completed" ? raw : "all";
}

/** `undefined` means "send no `completed` param at all", i.e. everything. */
export function statusToCompleted(status: StatusFilter): boolean | undefined {
  switch (status) {
    case "active":
      return false;
    case "completed":
      return true;
    default:
      return undefined;
  }
}

export interface UseStatusFilterResult {
  filter: StatusFilter;
  completed: boolean | undefined;
  setFilter: (next: StatusFilter) => void;
}

export function useStatusFilter(): UseStatusFilterResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = parseStatusParam(searchParams.get("status"));

  const setFilter = useCallback(
    (next: StatusFilter) => {
      const params = new URLSearchParams(searchParams);
      // "all" is the absence of the param, not ?status=all.
      if (next === "all") {
        params.delete("status");
      } else {
        params.set("status", next);
      }
      // Push rather than replace, so Back walks the filter history.
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  return { filter, completed: statusToCompleted(filter), setFilter };
}
