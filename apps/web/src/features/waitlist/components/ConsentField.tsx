import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { CONSENT_TEXT } from "../waitlist.constants";

type ConsentFieldProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  error?: string;
};

/**
 * The consent, never checked by default: the whole panel is its label, so
 * the text toggles the box too, and the deletion line is read with it.
 */
export function ConsentField({
  checked,
  onCheckedChange,
  error,
}: ConsentFieldProps) {
  const id = useId();
  const detailId = `${id}-detail`;
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1.5">
      <label className="flex cursor-pointer gap-3 rounded-sm bg-primary-soft-2 p-4 text-caption text-ink-secondary">
        <Checkbox
          name="consent"
          checked={checked}
          onCheckedChange={onCheckedChange}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${detailId} ${errorId}` : detailId}
          className="mt-px"
        />
        <span>
          {CONSENT_TEXT.label}
          <span id={detailId} className="mt-1 block text-ink-muted">
            {CONSENT_TEXT.detail}
          </span>
        </span>
      </label>
      {error && (
        <p id={errorId} className="text-caption font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
