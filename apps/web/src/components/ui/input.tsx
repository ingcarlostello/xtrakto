import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/utils/cn.utils";
import type * as React from "react";

// A text field as the waitlist design draws it (design-system.md §9): a
// rounded white box with a light border, 16px text on phones so iOS doesn't
// zoom in, and the global focus ring. Its label lives outside it.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-[12px] border border-chart-axis bg-surface px-4 text-base text-ink placeholder:text-ink-muted disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger sm:text-body",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
