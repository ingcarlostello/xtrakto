"use client";

import { Upload } from "lucide-react";
import { useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { exportDestination } from "../account-destination.helpers";
import { useUploadQueue } from "../hooks/use-upload-queue";
import { countText, fileRowView } from "../upload-display.helpers";
import { UPLOAD_COPY as COPY, UPLOAD_STATUS } from "../upload.constants";
import type {
  ExtractionWorker,
  UploadAccount,
  UploadItem,
} from "../upload.types";
import { AccountChoice } from "./AccountChoice";
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

type FileListProps = {
  items: readonly UploadItem[];
  accounts: readonly UploadAccount[];
  onRemove: (id: string) => void;
  onChooseAccount: (id: string, key: string) => void;
};

function FileList({
  items,
  accounts,
  onRemove,
  onChooseAccount,
}: FileListProps) {
  const batch = items.flatMap((item) =>
    item.status === UPLOAD_STATUS.READY ? [item.statement.preview] : [],
  );
  return (
    <ul aria-label={COPY.fileList} className="flex flex-col">
      {items.map((item) => (
        <FileRow
          key={item.id}
          name={item.file.name}
          view={fileRowView(item)}
          onRemove={() => onRemove(item.id)}
        >
          {item.status === UPLOAD_STATUS.READY &&
            item.statement.preview.accountLast4 === undefined && (
              <AccountChoice
                destination={exportDestination(
                  item.statement.preview,
                  accounts,
                  batch,
                )}
                chosen={item.accountKey}
                onChoose={(key) => onChooseAccount(item.id, key)}
              />
            )}
        </FileRow>
      ))}
    </ul>
  );
}

type UploadFlowProps = {
  /** The user's accounts, where a movements export can go. */
  accounts: readonly UploadAccount[];
  /** Shown at the end of the card: the formats read today. */
  children?: ReactNode;
};

export function UploadFlow({ accounts, children }: UploadFlowProps) {
  const { items, addFiles, remove, chooseAccount } = useUploadQueue({
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
        <FileList
          items={items}
          accounts={accounts}
          onRemove={removeFile}
          onChooseAccount={chooseAccount}
        />
      )}
      {readyCount > 0 && <SubmitFiles count={readyCount} />}
      {children}
    </Card>
  );
}
