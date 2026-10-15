import { countText, jobLabel } from "./upload-display.helpers";
import { offBy } from "./upload-result.helpers";
import {
  JOB_PROBLEMS,
  JOB_STATUS,
  PROBLEM_COPY,
  RESULT_COPY,
  STATEMENT_BALANCE,
  UPLOAD_COPY,
} from "./upload.constants";
import type { JobOutcome, UploadJob } from "./upload.types";
import { UPLOADED_FILES_COPY as COPY } from "./uploaded-files.constants";

/** A file sent, as "Archivos subidos" lists it: what it was and what came of it. */
export type UploadedFileView = {
  readonly title: string;
  readonly detail: string;
  readonly badge: {
    readonly label: string;
    readonly variant: "ok" | "neutral" | "attention";
  };
};

type Summary = Pick<UploadedFileView, "badge"> & {
  readonly facts: readonly string[];
};

// What a done job came to, the first that applies: a statement that doesn't
// reconcile, a file that added nothing, then the balance check.
const summaryOf = (outcome: JobOutcome): Summary => {
  const { stats, balance } = outcome;
  if (balance === STATEMENT_BALANCE.UNVERIFIED) {
    const amount = offBy(outcome);
    return {
      badge: { label: COPY.badge.notReconciled, variant: "attention" },
      facts: [
        countText(stats.total, UPLOAD_COPY.movements),
        amount ? `${COPY.notReconciledBy} ${amount}` : COPY.notReconciled,
      ],
    };
  }
  if (stats.added === 0)
    return {
      badge: { label: COPY.badge.unchanged, variant: "neutral" },
      facts: [countText(stats.total, COPY.had), COPY.nothingNew],
    };
  if (balance === STATEMENT_BALANCE.VERIFIED)
    return {
      badge: { label: COPY.badge.verified, variant: "ok" },
      facts: [
        countText(stats.total, UPLOAD_COPY.movements),
        outcome.chainedTo ? COPY.chained : COPY.reconciles,
      ],
    };
  return {
    badge: { label: COPY.badge.unverified, variant: "neutral" },
    facts: [countText(stats.added, RESULT_COPY.new), COPY.noBalance],
  };
};

/** A file sent, named by its format and period (docs/ui/v8-07). */
export const uploadedFileView = (job: UploadJob): UploadedFileView => {
  const title = jobLabel(job);
  if (job.outcome) {
    const { badge, facts } = summaryOf(job.outcome);
    return { title, detail: [UPLOAD_COPY.excel, ...facts].join(" · "), badge };
  }
  if (job.status === JOB_STATUS.FAILED) {
    const problem = job.errorCode
      ? JOB_PROBLEMS[job.errorCode]
      : PROBLEM_COPY.notProcessed;
    return {
      title,
      detail: problem.title,
      badge: { label: COPY.badge.failed, variant: "attention" },
    };
  }
  return {
    title,
    detail: UPLOAD_COPY.excel,
    badge: { label: COPY.badge.processing, variant: "neutral" },
  };
};
