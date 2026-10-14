import { CircleAlert, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAGE_ERROR_COPY as COPY } from "./layout.constants";

// In place of a page that failed: the attention surface with the orange dot,
// what happened and what to do, without apologizing (design-system.md §3.5).
export function PageError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-lg bg-spending-surface px-6 py-10 text-center sm:py-12">
      <span className="relative flex size-11 items-center justify-center rounded-full bg-surface text-ink">
        <CircleAlert className="size-5" strokeWidth={1.7} aria-hidden />
        <span className="absolute top-0.5 right-0.5 size-[9px] rounded-full bg-spending" />
      </span>
      <div className="flex max-w-md flex-col gap-1.5">
        <h1 className="text-section font-bold text-balance">{COPY.title}</h1>
        <p className="text-body text-pretty text-ink-secondary">
          {COPY.detail}
        </p>
      </div>
      <Button onClick={onRetry}>
        <RotateCw aria-hidden />
        {COPY.retry}
      </Button>
    </div>
  );
}
