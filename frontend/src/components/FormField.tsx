import { useId, type ReactNode } from "react";

export interface FormFieldRenderProps {
  id: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
}

export interface FormFieldProps {
  label: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  children: (props: FormFieldRenderProps) => ReactNode;
}

/**
 * Label + control + optional inline error, emitting the design system's
 * .form-field classes.
 *
 * Children is a render prop rather than plain children: the caller writes the
 * exact control it wants (input / textarea / select, each with its own class
 * from components.css), while `id`, `aria-invalid` and `aria-describedby` are
 * wired correctly by construction. Cloning a child element instead would hide
 * that wiring and break on fragments.
 */
export default function FormField({
  label,
  error,
  hint,
  required = false,
  children,
}: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`form-field${error ? " form-field--error" : ""}`}>
      <label className="form-field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {" "}
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>

      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
      })}

      {hint && (
        <span id={hintId} className="text-body-sm text-muted">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="form-field__error">
          <strong aria-hidden="true">!</strong> {error}
        </span>
      )}
    </div>
  );
}
