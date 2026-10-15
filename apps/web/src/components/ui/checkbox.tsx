"use client";

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "cn";
import { CheckIcon } from "lucide-react";

// A 22px box (design-system.md §9): a faint-ink border, 3.7:1 on white, which
// a control's edge needs; primary with a white check when it's on. Never
// checked by default. Base UI renders a hidden input with its name, so it
// submits with its form; the global focus ring marks it.
function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "flex size-5.5 shrink-0 items-center justify-center rounded-[6px] border-[1.5px] border-ink-faint bg-surface text-surface aria-invalid:border-danger data-checked:border-primary data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center [&>svg]:size-4"
      >
        <CheckIcon strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
