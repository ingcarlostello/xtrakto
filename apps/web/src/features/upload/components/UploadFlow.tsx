"use client";

import { Upload } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { useUploadQueue } from "../hooks/use-upload-queue";
import { countText, fileRowView } from "../upload-display.helpers";
import { UPLOAD_COPY as COPY, UPLOAD_STATUS } from "../upload.constants";
import type { ExtractionWorker } from "../upload.types";
import { DropZone } from "./DropZone";
import { FileRow } from "./FileRow";

// Turbopack bundles the worker, SheetJS included, into chunks of its own,
// served from this origin; the browser loads them when the first file is
// chosen, never with the page.
const createExtractionWorker = (): ExtractionWorker =>
  new Worker(new URL("../extract-statement.worker.ts", import.meta.url));

// Sending arrives with Phase 5.4b; until then the button says why it waits.
function SubmitFiles({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-start gap-2 border-t border-divider pt-4">
      <Button disabled>
        <Upload aria-hidden />
        {`${COPY.submit} ${countText(count, COPY.files)}`}
      </Button>
      <p className="text-caption text-ink-muted">{COPY.notSentYet}</p>
    </div>
  );
}

export function UploadFlow() {
  const { items, addFiles, remove } = useUploadQueue({
    createWorker: createExtractionWorker,
  });
  const chooseButton = useRef<HTMLButtonElement>(null);
  const readyCount = items.filter(
    (item) => item.status === UPLOAD_STATUS.READY,
  ).length;

  // A removed row takes the focus with it: hand it back to the picker.
  const removeFile = (id: string) => {
    remove(id);
    chooseButton.current?.focus();
  };

  return (
    <Card variant="card">
      <CardHeader>
        <h2 className="text-section font-bold text-balance">
          {COPY.chooseTitle}
        </h2>
        <CardDescription>{COPY.chooseDescription}</CardDescription>
      </CardHeader>
      <DropZone ref={chooseButton} onFiles={addFiles} />
      {items.length > 0 && (
        <ul aria-label={COPY.fileList} className="flex flex-col">
          {items.map((item) => (
            <FileRow
              key={item.id}
              name={item.file.name}
              view={fileRowView(item)}
              onRemove={() => removeFile(item.id)}
            />
          ))}
        </ul>
      )}
      {readyCount > 0 && <SubmitFiles count={readyCount} />}
    </Card>
  );
}
