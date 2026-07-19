export type FlashTone = "success" | "error";

/** `id` changes on every message so repeating the same text re-announces it. */
export interface FlashMessage {
  id: number;
  message: string;
  tone: FlashTone;
}

/**
 * The live region for transient confirmations.
 *
 * The wrapper is ALWAYS mounted and only its contents change. A role="status"
 * element that mounts together with its text is frequently not announced by
 * screen readers — the region has to already exist for the insertion to be
 * noticed.
 */
export default function Flash({ flash }: { flash: FlashMessage | null }) {
  return (
    <div className="flash-region" role="status" aria-live="polite">
      {flash && (
        <div className={`flash flash--${flash.tone}`}>
          <span className="flash__icon" aria-hidden="true">
            {flash.tone === "success" ? "✓" : "⚠"}
          </span>
          {flash.message}
        </div>
      )}
    </div>
  );
}
