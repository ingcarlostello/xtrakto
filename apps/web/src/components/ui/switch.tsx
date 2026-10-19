"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/utils/cn.utils";

// A 44 × 26 pill (design-system.md §9): primary when it's on, the ring's
// track when it's off, edged in faint ink as the checkbox (3.7:1 on white,
// which a control's edge needs), a white thumb, and always a visible label
// beside it. Base UI renders a hidden input with its name and value, so it
// submits with its form; the global focus ring marks it, and its hit area
// reaches 44px.
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-6.5 w-11 shrink-0 items-center rounded-full p-[3px] ring-[1.5px] ring-transparent transition-colors ring-inset after:absolute after:-inset-x-1 after:-inset-y-2 data-checked:bg-primary data-unchecked:bg-ring-track data-unchecked:ring-ink-faint data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-5 rounded-full bg-surface shadow-chip transition-transform data-checked:translate-x-4.5 data-unchecked:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
