"use client";

import { FileText } from "lucide-react";
import { useRef } from "react";
import type { ChangeEvent, Ref } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { useUploadQueue } from "../hooks/use-upload-queue";
import { UPLOAD_COPY as COPY, UPLOAD_STATUS } from "../upload.constants";
import type { ExtractionWorker, UploadItem } from "../upload.types";
import { FileRow } from "./FileRow";

// Turbopack bundles the worker, SheetJS included, into chunks of its own,
// served from this origin; the browser loads them when the first file is
// chosen, never with the page.
const createExtractionWorker = (): ExtractionWorker =>
  new Worker(new URL("../extract-statement.worker.ts", import.meta.url));

const statusText = (item: UploadItem): string => {
  switch (item.status) {
    case UPLOAD_STATUS.WAITING:
      return COPY.waiting;
    case UPLOAD_STATUS.EXTRACTING:
      return COPY.stage[item.stage];
    case UPLOAD_STATUS.READY:
      return COPY.ready;
    case UPLOAD_STATUS.FAILED:
      return COPY.failed;
  }
};

type ChooseFilesProps = {
  ref: Ref<HTMLButtonElement>;
  onChoose: (files: readonly File[]) => void;
};

// The native picker stays hidden behind a real button, which takes the focus.
function ChooseFiles({ ref, onChoose }: ChooseFilesProps) {
  const input = useRef<HTMLInputElement>(null);

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    onChoose([...(event.target.files ?? [])]);
    // Choosing the same file again must fire another change.
    event.target.value = "";
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <input
        ref={input}
        type="file"
        accept=".xlsx"
        multiple
        hidden
        onChange={choose}
      />
      <Button ref={ref} onClick={() => input.current?.click()}>
        <FileText aria-hidden />
        {COPY.choose}
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
      <ChooseFiles ref={chooseButton} onChoose={addFiles} />
      {items.length > 0 && (
        <ul className="flex flex-col">
          {items.map((item) => (
            <FileRow
              key={item.id}
              name={item.file.name}
              status={statusText(item)}
              onRemove={() => removeFile(item.id)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
