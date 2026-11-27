import type { ReactNode } from "react";

/**
 * A line on the attention surface with its 9px orange dot (design-system.md
 * §3): what needs a look, such as a card's rate past the usury (12.4b).
 */
export function AttentionLine({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 rounded-md bg-spending-surface px-4 py-3 text-caption text-ink-secondary">
      <span
        aria-hidden
        className="mt-1.5 size-[9px] shrink-0 rounded-full bg-spending"
      />
      <span>{children}</span>
    </p>
  );
}
