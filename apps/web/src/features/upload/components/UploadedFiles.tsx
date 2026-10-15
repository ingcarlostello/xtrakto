import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import type { UploadJob } from "../upload.types";
import {
  FIRST_FILES_SHOWN,
  UPLOADED_FILES_COPY as COPY,
} from "../uploaded-files.constants";
import { uploadedFileView } from "../uploaded-files.helpers";
import { FileIcon } from "./FileRow";
import { ShowMoreList } from "./ShowMoreList";

// Named by format and period, since a file's name never leaves the browser.
// On phones the badge goes under the text, which keeps the width.
function UploadedFile({ job }: { job: UploadJob }) {
  const { title, detail, badge } = uploadedFileView(job);
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-1.5 border-t border-divider py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <span className="row-span-2 sm:row-span-1">
        <FileIcon isProblem={false} />
      </span>
      <div className="flex flex-col">
        <p className="text-body font-bold text-balance">{title}</p>
        <p className="text-caption text-ink-muted">{detail}</p>
      </div>
      <Badge variant={badge.variant}>{badge.label}</Badge>
    </li>
  );
}

/** The latest files sent, newest first, each with its result (docs/ui/v8-07). */
export function UploadedFiles({ jobs }: { jobs: readonly UploadJob[] }) {
  if (jobs.length === 0) return null;
  const rest = jobs.length - FIRST_FILES_SHOWN;
  return (
    <Card variant="card">
      <CardHeader>
        <h2 className="text-section font-bold text-balance">{COPY.title}</h2>
        <CardDescription>{COPY.subtitle}</CardDescription>
      </CardHeader>
      <ShowMoreList
        items={jobs.map((job) => (
          <UploadedFile key={job.jobId} job={job} />
        ))}
        first={FIRST_FILES_SHOWN}
        moreLabel={`${COPY.showMore.before} ${rest} ${COPY.showMore.after}`}
        lessLabel={COPY.showLess}
      />
    </Card>
  );
}
