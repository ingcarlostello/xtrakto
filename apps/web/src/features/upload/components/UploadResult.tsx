import { cn } from "cn";
import { Check, CircleCheck, FileSpreadsheet } from "lucide-react";
import { StatusPill } from "@/components/status-pill/StatusPill";
import { Badge } from "@/components/ui/badge";
import type { ResultStep, ResultView } from "../upload-result.helpers";

// A check on the soft green when it went well; on the attention surface, a
// white chip with the orange dot (§3.5).
function ResultIcon({ isOk }: { isOk: boolean }) {
  return (
    <span
      className={cn(
        "relative flex size-11 shrink-0 items-center justify-center rounded-full",
        isOk ? "bg-income-soft text-income-on-soft" : "bg-surface text-ink",
      )}
    >
      {isOk ? (
        <CircleCheck className="size-5" strokeWidth={1.9} aria-hidden />
      ) : (
        <FileSpreadsheet className="size-5" strokeWidth={1.7} aria-hidden />
      )}
      {!isOk && (
        <span className="absolute top-0.5 right-0.5 size-[9px] rounded-full bg-spending" />
      )}
    </span>
  );
}

type CountsProps = { counts: ResultView["counts"]; isOk: boolean };

function Counts({ counts, isOk }: CountsProps) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {counts.map(({ value, label }) => (
        <li
          key={label}
          className={cn(
            "flex flex-col gap-1 rounded-md px-4 py-3",
            isOk ? "bg-surface-muted" : "bg-surface",
          )}
        >
          <span className="font-display text-amount-l font-medium tabular-nums">
            {value}
          </span>
          <span className="text-caption text-ink-muted">{label}</span>
        </li>
      ))}
    </ul>
  );
}

// Each step with its mark, joined by a line down to the next.
function Steps({ steps }: { steps: readonly ResultStep[] }) {
  return (
    <ol className="flex flex-col">
      {steps.map(({ title, detail, isOk }, index) => (
        <li key={title} className="relative flex gap-3 pb-4 last:pb-0">
          {index < steps.length - 1 && (
            <span
              aria-hidden
              className="absolute top-7 bottom-0 left-3 w-px bg-divider"
            />
          )}
          <span
            className={cn(
              "relative flex size-6 shrink-0 items-center justify-center rounded-full",
              isOk ? "bg-income-soft text-income-on-soft" : "bg-spending-soft",
            )}
          >
            {isOk ? (
              <Check className="size-3.5" strokeWidth={2.4} aria-hidden />
            ) : (
              <span aria-hidden className="size-2 rounded-full bg-spending" />
            )}
          </span>
          <div className="flex min-w-0 flex-col">
            <p className="text-sm font-bold">{title}</p>
            <p className="text-caption text-ink-muted">{detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

type UploadResultProps = {
  /** The file's name, which never leaves the browser, or its format and period. */
  name: string;
  tags: readonly string[];
  view: ResultView;
};

/** A processed file's result, in the list (docs/ui/v8-08, within Stage 5). */
export function UploadResult({ name, tags, view }: UploadResultProps) {
  return (
    <li
      className={cn(
        "flex flex-col gap-4 py-4",
        view.isOk
          ? "border-t border-divider first:border-t-0"
          : "-mx-3.5 my-1 rounded-md bg-spending-surface px-3.5",
      )}
    >
      <div className="flex items-start gap-3.5" aria-live="polite">
        <ResultIcon isOk={view.isOk} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-body font-bold text-balance">{view.title}</p>
          <p className="truncate text-caption text-ink-muted">{name}</p>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="tag">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {view.note && (
            <p className="text-caption text-ink-secondary">{view.note}</p>
          )}
        </div>
      </div>
      <Counts counts={view.counts} isOk={view.isOk} />
      <StatusPill {...view.pill} className="self-start" />
      <Steps steps={view.steps} />
    </li>
  );
}
