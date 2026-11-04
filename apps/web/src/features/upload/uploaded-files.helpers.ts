import { countText } from "@/utils/count-text.utils";
import { fileTypeOf } from "@/utils/statement-label.helpers";
import { jobLabel } from "./upload-display.helpers";
import { RESULT_COPY } from "./upload-result.constants";
import { offBy } from "./upload-result.helpers";
import {
  JOB_PROBLEMS,
  JOB_STATUS,
  PROBLEM_COPY,
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
    readonly variant: "ok" | "neutral" | "attention" | "info";
  };
};

type Summary = Pick<UploadedFileView, "badge"> & {
  readonly facts: readonly string[];
};

// The references its movements gave or took (10.1b): "12 referencias
// agregadas".
const referenceFacts = ({ matches }: JobOutcome): readonly string[] =>
  matches.references > 0
    ? [countText(matches.references, RESULT_COPY.references)]
    : [];

// A file that added nothing new: complete when it brought references, or
// with nothing to change (v8-07).
const unchangedSummary = (outcome: JobOutcome): Summary => {
  const references = referenceFacts(outcome);
  const had = countText(outcome.stats.total, COPY.had);
  return references.length > 0
    ? {
        badge: { label: COPY.badge.completed, variant: "info" },
        facts: [had, ...references],
      }
    : {
        badge: { label: COPY.badge.unchanged, variant: "neutral" },
        facts: [had, COPY.nothingNew],
      };
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
  if (stats.added === 0) return unchangedSummary(outcome);
  if (balance === STATEMENT_BALANCE.VERIFIED)
    return {
      badge: { label: COPY.badge.verified, variant: "ok" },
      facts: [
        countText(stats.total, UPLOAD_COPY.movements),
        outcome.chainedTo ? COPY.chained : COPY.reconciles,
        ...referenceFacts(outcome),
      ],
    };
  return exportSummary(outcome);
};

// A movements export with new movements: verified once its quarterly
// statement covers its days and agrees with it (10.1b), else without balance.
const exportSummary = (outcome: JobOutcome): Summary => {
  const isVerified = outcome.matches.verifiedBy.length > 0;
  return {
    badge: isVerified
      ? { label: COPY.badge.verified, variant: "ok" }
      : { label: COPY.badge.unverified, variant: "neutral" },
    facts: [
      countText(outcome.stats.added, RESULT_COPY.new),
      ...referenceFacts(outcome),
      isVerified ? COPY.verifiedByQuarterly : COPY.noBalance,
    ],
  };
};

// The file its format comes in, "Excel" or "PDF", when the job knows it.
const fileTypeFacts = ({ formatId }: UploadJob): readonly string[] =>
  formatId === undefined ? [] : [fileTypeOf(formatId)];

/** A file sent, named by its format and period (docs/ui/v8-07). */
export const uploadedFileView = (job: UploadJob): UploadedFileView => {
  const title = jobLabel(job);
  if (job.outcome) {
    const { badge, facts } = summaryOf(job.outcome);
    return {
      title,
      detail: [...fileTypeFacts(job), ...facts].join(" · "),
      badge,
    };
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
    detail: fileTypeFacts(job).join(" · "),
    badge: { label: COPY.badge.processing, variant: "neutral" },
  };
};
