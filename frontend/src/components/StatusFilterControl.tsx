import type { StatusFilter } from "../types";

const OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

export interface StatusFilterControlProps {
  value: StatusFilter;
  onChange: (next: StatusFilter) => void;
  disabled?: boolean;
}

/**
 * A toggle-button group rather than a radiogroup: these are actions that change
 * what's displayed, and `aria-pressed` is what drives the selected styling, so
 * the visual state can't drift from the accessibility tree.
 */
export default function StatusFilterControl({
  value,
  onChange,
  disabled = false,
}: StatusFilterControlProps) {
  return (
    <div className="segmented" role="group" aria-label="Filter tasks">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className="segmented__option"
          aria-pressed={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
