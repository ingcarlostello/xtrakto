import { cn } from "cn";
import { FileSpreadsheet } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FileRowView } from "../upload-display.helpers";
import { UPLOAD_COPY as COPY } from "../upload.constants";

function RowBody({ view }: { view: FileRowView }) {
  switch (view.kind) {
    case "progress":
      return <p className="text-caption text-ink-muted">{view.text}</p>;
    case "ready":
      return (
        <>
          {view.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {view.tags.map((tag) => (
                <Badge key={tag} variant="tag">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {view.count && (
            <p className="text-caption text-ink-muted">{view.count}</p>
          )}
          {view.note && (
            <p className="text-caption font-semibold text-ink-secondary">
              {view.note}
            </p>
          )}
          {view.notice && (
            <p className="text-caption text-ink-muted">{view.notice}</p>
          )}
        </>
      );
    case "problem":
      return (
        <>
          <p className="text-sm font-bold">{view.title}</p>
          <p className="text-caption text-ink-secondary">{view.detail}</p>
        </>
      );
  }
}

// On the attention surface, the chip turns white and gets the orange dot.
function FileIcon({ isProblem }: { isProblem: boolean }) {
  return (
    <span
      className={cn(
        "relative flex size-11 shrink-0 items-center justify-center rounded-full text-ink",
        isProblem ? "bg-surface" : "bg-surface-muted",
      )}
    >
      <FileSpreadsheet className="size-5" strokeWidth={1.7} aria-hidden />
      {isProblem && (
        <span className="absolute top-0.5 right-0.5 size-[9px] rounded-full bg-spending" />
      )}
    </span>
  );
}

type RowActionProps = {
  label: string;
  name: string;
  isBusy: boolean;
  onClick: () => void;
  className?: string;
};

// A link action that names its file for screen readers.
function RowAction({
  label,
  name,
  isBusy,
  onClick,
  className,
}: RowActionProps) {
  return (
    <Button
      variant="link"
      className={className}
      disabled={isBusy}
      onClick={onClick}
      aria-label={`${label} ${name}`}
    >
      {label}
    </Button>
  );
}

type FileRowProps = {
  name: string;
  view: FileRowView;
  /** Absent once the file is going up or gone up: sent, it can't be taken back. */
  onRemove?: () => void;
  /** For a file whose send got no answer. */
  onRetry?: () => void;
  /** While files go up, the row's actions wait. */
  isBusy?: boolean;
  /** Below the file's status, outside what is announced: its account. */
  children?: ReactNode;
};

// A chosen file; its name never leaves the browser. A file with a problem
// sits on the attention surface, with the orange dot (§3.5).
export function FileRow({
  name,
  view,
  onRemove,
  onRetry,
  isBusy = false,
  children,
}: FileRowProps) {
  const isProblem = view.kind === "problem";
  const action = (label: string, onClick: () => void, className?: string) => (
    <RowAction {...{ label, name, isBusy, onClick, className }} />
  );
  return (
    <li
      className={cn(
        "flex items-center gap-3.5 py-3.5",
        // The surface reaches past the row, so the icons stay in one column.
        isProblem
          ? "-mx-3.5 my-1 rounded-md bg-spending-surface px-3.5"
          : "border-t border-divider first:border-t-0",
      )}
    >
      <FileIcon isProblem={isProblem} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-body font-bold">{name}</p>
        <div className="flex flex-col gap-1" aria-live="polite">
          <RowBody view={view} />
        </div>
        {onRetry && action(COPY.retry, onRetry, "self-start")}
        {children}
      </div>
      {onRemove && action(COPY.remove, onRemove)}
    </li>
  );
}
