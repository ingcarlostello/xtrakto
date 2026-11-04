import { cn } from "@/utils/cn.utils";
import { FileSpreadsheet, FileText, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FileRowView } from "../upload-display.helpers";
import { UPLOAD_COPY as COPY } from "../upload.constants";
import type { FileKind } from "../upload.types";

// A spreadsheet's icon, a PDF's, and the lock of a PDF that asks for its
// password (docs/ui/v8-09).
const FILE_ICONS = {
  excel: FileSpreadsheet,
  pdf: FileText,
  locked: Lock,
} as const;

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
    case "locked":
      return (
        <>
          <p className="text-sm font-bold">{view.title}</p>
          <p className="text-caption text-ink-secondary">{view.detail}</p>
        </>
      );
  }
}

type FileIconProps = {
  kind?: keyof typeof FILE_ICONS;
  isProblem: boolean;
};

// On the attention surface, the chip turns white and gets the orange dot.
export function FileIcon({ kind = "excel", isProblem }: FileIconProps) {
  const Icon = FILE_ICONS[kind];
  return (
    <span
      className={cn(
        "relative flex size-11 shrink-0 items-center justify-center rounded-full text-ink",
        isProblem ? "bg-surface" : "bg-surface-muted",
      )}
    >
      <Icon className="size-5" strokeWidth={1.7} aria-hidden />
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
  /** A spreadsheet or a PDF, for its icon. */
  kind?: FileKind;
  /** Absent once the file is going up or gone up: sent, it can't be taken back. */
  onRemove?: () => void;
  /** For a file whose send got no answer. */
  onRetry?: () => void;
  /** While files go up, the row's actions wait. */
  isBusy?: boolean;
  /**
   * Under the row, outside what is announced: what the person settles for
   * the file, its account or the password its PDF asks for. It takes the
   * row's whole width on phones, and the text's from `sm`.
   */
  children?: ReactNode;
};

// A chosen file; its name never leaves the browser. A file with a problem,
// or a PDF that asks for its password, sits on the attention surface, with
// the orange dot (§3.5).
export function FileRow({
  name,
  view,
  kind = "excel",
  onRemove,
  onRetry,
  isBusy = false,
  children,
}: FileRowProps) {
  const isLocked = view.kind === "locked";
  const isProblem = view.kind === "problem" || isLocked;
  const action = (label: string, onClick: () => void, className?: string) => (
    <RowAction {...{ label, name, isBusy, onClick, className }} />
  );
  return (
    <li
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3.5 py-3.5",
        // A row as tall as a password's form keeps its chip by its title.
        isLocked ? "items-start" : "items-center",
        // The surface reaches past the row, so the icons stay in one column.
        isProblem
          ? "-mx-3.5 my-1 rounded-md bg-spending-surface px-3.5"
          : "border-t border-divider first:border-t-0",
      )}
    >
      <FileIcon kind={isLocked ? "locked" : kind} isProblem={isProblem} />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate text-body font-bold">{name}</p>
        <div className="flex flex-col gap-1" aria-live="polite">
          <RowBody view={view} />
        </div>
        {onRetry && action(COPY.retry, onRetry, "self-start")}
      </div>
      {onRemove && action(COPY.remove, onRemove)}
      {children && (
        <div className="col-span-full pt-1 sm:col-start-2">{children}</div>
      )}
    </li>
  );
}
