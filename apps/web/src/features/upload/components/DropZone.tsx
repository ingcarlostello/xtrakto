import { cn } from "@/utils/cn.utils";
import { FileText, Upload } from "lucide-react";
import { useRef } from "react";
import type { ChangeEvent, Ref } from "react";
import { Button } from "@/components/ui/button";
import { useFileDrop } from "../hooks/use-file-drop";
import { ACCEPTED_EXTENSION, UPLOAD_COPY as COPY } from "../upload.constants";

type DropZoneProps = {
  /** The "Elegir archivos" button, so the focus can come back to it. */
  ref?: Ref<HTMLButtonElement>;
  onFiles: (files: readonly File[]) => void;
};

// Files are dropped on the zone or chosen with its button, the way in with a
// keyboard or on a phone. The native picker stays hidden behind the button.
export function DropZone({ ref, onFiles }: DropZoneProps) {
  const { zoneRef, isOver, zoneProps } = useFileDrop(onFiles);
  const input = useRef<HTMLInputElement>(null);

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    onFiles([...(event.target.files ?? [])]);
    // Choosing the same file again must fire another change.
    event.target.value = "";
  };

  return (
    <div
      ref={zoneRef}
      {...zoneProps}
      className={cn(
        "flex flex-col items-center gap-4 rounded-md border-2 border-dashed px-5 py-10 text-center transition-colors",
        isOver ? "border-primary bg-primary-soft/60" : "border-primary/30",
      )}
    >
      <span className="flex size-18 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Upload className="size-7" strokeWidth={1.9} aria-hidden />
      </span>
      <p className="font-display text-amount-l font-medium text-balance">
        {COPY.dropTitle}
      </p>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_EXTENSION}
        multiple
        hidden
        onChange={choose}
      />
      <Button ref={ref} onClick={() => input.current?.click()}>
        <FileText aria-hidden />
        {COPY.choose}
      </Button>
      <p className="max-w-xl text-caption text-pretty text-ink-muted">
        {COPY.dropHint}
      </p>
    </div>
  );
}
