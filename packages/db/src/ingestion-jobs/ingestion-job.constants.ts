export const INGESTION_JOB_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  DONE: "done",
  FAILED: "failed",
} as const;

/** Why a job failed: codes only, which Inngest and the screen may show. */
export const INGESTION_JOB_ERROR = {
  /** No parser recognizes the content. */
  UNKNOWN_FORMAT: "UNKNOWN_FORMAT",
  /** A parser recognizes it, but a part doesn't read as the bank writes it. */
  PARSE_FAILED: "PARSE_FAILED",
  /** A movements export sent without an account, and the user has several. */
  ACCOUNT_REQUIRED: "ACCOUNT_REQUIRED",
  /** Every retry failed for a reason that isn't the file's. */
  INTERNAL_ERROR: "INTERNAL_ERROR",
  /** Left pending or processing for 24 hours (Phase 5.5c). */
  CONTENT_EXPIRED: "CONTENT_EXPIRED",
} as const;
