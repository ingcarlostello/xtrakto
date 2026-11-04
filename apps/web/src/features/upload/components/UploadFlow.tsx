"use client";

import { Upload } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { countText } from "@/utils/count-text.utils";
import { exportDestination } from "../account-destination.helpers";
import { type FileActions, useUploadFlow } from "../hooks/use-upload-flow";
import {
  fileKindOf,
  fileRowView,
  isLimitReached,
  jobFileKind,
  jobLabel,
  jobView,
  limitText,
  previewTags,
} from "../upload-display.helpers";
import type { FileRowView } from "../upload-display.helpers";
import type { PollingStop } from "../upload-jobs.helpers";
import { resultView } from "../upload-result.helpers";
import { batchPreviews } from "../upload-send.helpers";
import {
  NO_ANSWER,
  UPLOAD_COPY as COPY,
  UPLOAD_STATUS,
} from "../upload.constants";
import type {
  MonthlyUsage,
  StatementPreview,
  UploadAccount,
  UploadItem,
  UploadJob,
} from "../upload.types";
import { AccountChoice } from "./AccountChoice";
import { DropZone } from "./DropZone";
import { FileRow } from "./FileRow";
import { PdfPasswordForm } from "./PdfPasswordForm";
import { UploadResult } from "./UploadResult";

type SubmitFilesProps = {
  count: number;
  usage: MonthlyUsage;
  isBusy: boolean;
  onSubmit: () => void;
};

// Sends the files read whose account is settled. Once the month's statements
// are used up, it waits and says when they renew.
function SubmitFiles({ count, usage, isBusy, onSubmit }: SubmitFilesProps) {
  const isUsedUp = isLimitReached(usage);
  return (
    <div className="flex flex-col items-start gap-2 border-t border-divider pt-4">
      <Button
        disabled={isBusy || isUsedUp || count === 0}
        focusableWhenDisabled
        onClick={onSubmit}
      >
        <Upload aria-hidden />
        {isBusy
          ? COPY.sending
          : `${COPY.submit} ${countText(count, COPY.files)}`}
      </Button>
      {isUsedUp && (
        <p className="text-caption text-ink-muted">{limitText(usage)}</p>
      )}
    </div>
  );
}

type QueuedFileProps = {
  item: UploadItem;
  /** Once sent, how its job goes. */
  job?: UploadJob;
  accounts: readonly UploadAccount[];
  batch: readonly StatementPreview[];
  isBusy: boolean;
  actions: FileActions;
  /** The "Elegir archivos" button, whose focus a PDF's password may take. */
  picker: RefObject<HTMLButtonElement | null>;
};

// What the person settles in a file's row, if anything: the password its PDF
// asks for, or where a movements export goes. The form stays the same
// element while the password typed is tried, so it keeps its focus.
function rowChoice({
  item,
  view,
  accounts,
  batch,
  isBusy,
  actions,
  picker,
}: QueuedFileProps & { view: FileRowView }): ReactNode {
  if (view.kind === "locked")
    return (
      <PdfPasswordForm
        isWrong={view.isWrong}
        isOpening={view.isOpening}
        isBusy={isBusy}
        picker={picker}
        onOpen={(password) => actions.onOpenPdf(item.id, password)}
        onChooseAnother={() => actions.onChooseAnother(item.id)}
      />
    );
  if (item.status !== UPLOAD_STATUS.READY) return null;
  const { preview } = item.statement;
  return preview.accountLast4 === undefined ? (
    <AccountChoice
      destination={exportDestination(preview, accounts, batch)}
      chosen={item.accountKey}
      isBusy={isBusy}
      onChoose={(key) => actions.onChooseAccount(item.id, key)}
    />
  ) : null;
}

// A file going up, or gone up, can no longer be removed; one whose send got
// no answer can be tried again.
function QueuedFile(props: QueuedFileProps) {
  const { item, job, isBusy, actions } = props;
  const isOnItsWay =
    item.status === UPLOAD_STATUS.SENDING || item.status === UPLOAD_STATUS.SENT;
  const canRetry =
    item.status === UPLOAD_STATUS.READY && item.sendProblem === NO_ANSWER;
  const view = fileRowView(item, job);
  return (
    <FileRow
      name={item.file.name}
      view={view}
      kind={fileKindOf(item)}
      isBusy={isBusy}
      onRemove={isOnItsWay ? undefined : () => actions.onRemove(item.id)}
      onRetry={canRetry ? () => actions.onRetry(item.id) : undefined}
    >
      {rowChoice({ ...props, view })}
    </FileRow>
  );
}

type FileListProps = {
  items: readonly UploadItem[];
  /** Jobs of an earlier visit, which the URL kept: named by format and period. */
  restored: readonly string[];
  jobs: ReadonlyMap<string, UploadJob>;
  accounts: readonly UploadAccount[];
  isBusy: boolean;
  actions: FileActions;
  picker: RefObject<HTMLButtonElement | null>;
};

type SentFileProps = {
  name: string;
  /** What the page read of the file; none for a job the URL kept. */
  preview?: StatementPreview;
  job: UploadJob;
};

// A sent file whose job is done shows its result; until then, its row.
function SentFile({ name, preview, job }: SentFileProps) {
  return job.outcome ? (
    <UploadResult
      name={name}
      kind={jobFileKind(job)}
      tags={preview ? previewTags(preview) : []}
      view={resultView(job, job.outcome, preview?.pdf)}
    />
  ) : (
    <FileRow name={name} view={jobView(job)} kind={jobFileKind(job)} />
  );
}

function FileList({ items, restored, jobs, ...rest }: FileListProps) {
  if (items.length + restored.length === 0) return null;
  const batch = batchPreviews(items);
  return (
    <ul aria-label={COPY.fileList} className="flex flex-col">
      {items.map((item) => {
        const job =
          item.status === UPLOAD_STATUS.SENT ? jobs.get(item.jobId) : undefined;
        return item.status === UPLOAD_STATUS.SENT && job?.outcome ? (
          <SentFile
            key={item.id}
            name={item.file.name}
            preview={item.preview}
            job={job}
          />
        ) : (
          <QueuedFile
            key={item.id}
            item={item}
            job={job}
            batch={batch}
            {...rest}
          />
        );
      })}
      {restored.map((jobId) => {
        const job = jobs.get(jobId);
        return job ? (
          <SentFile key={jobId} name={jobLabel(job)} job={job} />
        ) : (
          <FileRow
            key={jobId}
            name={COPY.statement}
            view={{ kind: "progress", text: COPY.checking }}
          />
        );
      })}
    </ul>
  );
}

type StatusCheckProps = {
  stopped?: PollingStop;
  onCheckAgain: () => void;
};

// Announced when the screen stops asking how its jobs go.
function StatusCheck({ stopped, onCheckAgain }: StatusCheckProps) {
  return (
    <div role="status">
      {stopped && (
        <div className="flex flex-wrap items-center gap-x-3">
          <p className="text-caption text-ink-secondary">
            {stopped === "failures" ? COPY.checkFailed : COPY.checkTimedOut}
          </p>
          <Button variant="link" onClick={onCheckAgain}>
            {COPY.checkAgain}
          </Button>
        </div>
      )}
    </div>
  );
}

type UploadFlowProps = {
  /** The user's accounts, where a movements export can go. */
  accounts: readonly UploadAccount[];
  /** The month's statements, counted on the server. */
  usage: MonthlyUsage;
  /** Shown at the end of the card: the formats read today. */
  children?: ReactNode;
};

export function UploadFlow({ accounts, usage, children }: UploadFlowProps) {
  const { items, restored, statuses, files, isBusy, ...flow } =
    useUploadFlow(accounts);
  const { picker, addFiles, actions, sendAll } = flow;
  return (
    <Card variant="card">
      <CardHeader>
        <h2 className="text-section font-bold text-balance">
          {COPY.chooseTitle}
        </h2>
        <CardDescription>{COPY.chooseDescription}</CardDescription>
      </CardHeader>
      <DropZone ref={picker} onFiles={addFiles} />
      <FileList
        {...{ items, restored, accounts, isBusy, actions, picker }}
        jobs={statuses.jobs}
      />
      <StatusCheck
        stopped={statuses.stopped}
        onCheckAgain={statuses.checkAgain}
      />
      {(files.length > 0 || isBusy) && (
        <SubmitFiles
          count={files.length}
          usage={usage}
          isBusy={isBusy}
          onSubmit={sendAll}
        />
      )}
      {children}
    </Card>
  );
}
