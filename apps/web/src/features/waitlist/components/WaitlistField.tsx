import { type ComponentProps, useId } from "react";
import { Input } from "@/components/ui/input";

type WaitlistFieldProps = Pick<
  ComponentProps<"input">,
  "type" | "autoComplete" | "inputMode" | "placeholder"
> & {
  name: "name" | "email";
  label: string;
  error?: string;
};

/** A labeled text field, its problem read with it (design-system.md §12). */
export function WaitlistField({
  name,
  label,
  error,
  ...input
}: WaitlistFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-caption font-bold text-ink">
        {label}
      </label>
      <Input
        id={id}
        name={name}
        autoCapitalize={name === "email" ? "none" : undefined}
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...input}
      />
      {error && (
        <p id={errorId} className="text-caption font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
