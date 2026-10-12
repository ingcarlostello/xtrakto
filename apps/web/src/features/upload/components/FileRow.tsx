import { cn } from "cn";
import { FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FileRowView } from "../upload-display.helpers";
import { UPLOAD_COPY as COPY } from "../upload.constants";

type FileRowProps = {
  name: string;
  view: FileRowView;
  onRemove: () => void;
};

function RowBody({ view }: { view: FileRowView }) {
  switch (view.kind) {
    case "progress":
      return <p className="text-caption text-ink-muted">{view.text}</p>;
    case "ready":
      return (
        <>
          <div className="flex flex-wrap gap-1.5">
            {view.tags.map((tag) => (
              <Badge key={tag} variant="tag">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="text-caption text-ink-muted">{view.count}</p>
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

// A chosen file before it's sent; its name never leaves the browser. A file
// with a problem sits on the attention surface, with the orange dot (§3.5).
export function FileRow({ name, view, onRemove }: FileRowProps) {
  const isProblem = view.kind === "problem";
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
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate text-body font-bold">{name}</p>
        <div className="flex flex-col gap-1" aria-live="polite">
          <RowBody view={view} />
        </div>
      </div>
      <Button
        variant="link"
        onClick={onRemove}
        aria-label={`${COPY.remove} ${name}`}
      >
        {COPY.remove}
      </Button>
    </li>
  );
}
