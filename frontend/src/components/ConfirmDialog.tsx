import { useEffect, useId, useRef } from "react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  confirmTone?: "primary" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A native <dialog>, so focus trapping, Escape and inertness of the rest of the
 * page come from the browser rather than hand-rolled JS.
 *
 * The delivered .dialog-overlay / .dialog classes assume a plain <div>;
 * app-shell.css carries the overrides that make them work on a real <dialog>.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  confirmTone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Fired by Escape. Prevent the default close so React state stays the
    // single source of truth for whether the dialog is open.
    const handleCancel = (event: Event) => {
      event.preventDefault();
      if (!busy) onCancel();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [busy, onCancel]);

  return (
    <dialog
      ref={dialogRef}
      className="dialog-overlay"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      // The <dialog> itself is the full-bleed overlay, so a click landing on it
      // rather than on .dialog is a click outside the modal.
      onClick={(event) => {
        if (event.target === dialogRef.current && !busy) onCancel();
      }}
    >
      <div className="dialog">
        <h2 className="dialog__title" id={titleId}>
          {title}
        </h2>
        <p className="dialog__body" id={bodyId}>
          {body}
        </p>
        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn btn--${confirmTone}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
