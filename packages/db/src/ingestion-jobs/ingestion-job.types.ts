import type {
  INGESTION_JOB_ERROR,
  INGESTION_JOB_STATUS,
} from "./ingestion-job.constants";

export type IngestionJobStatus =
  (typeof INGESTION_JOB_STATUS)[keyof typeof INGESTION_JOB_STATUS];

export type IngestionJobError =
  (typeof INGESTION_JOB_ERROR)[keyof typeof INGESTION_JOB_ERROR];

/**
 * What a done job counts, from `saveStatement`: numbers only. The monthly
 * limit reads `added`, so it keeps that name.
 */
export type IngestionStats = {
  readonly total: number;
  readonly added: number;
  readonly skipped: number;
  readonly covered: number;
  readonly hidden: number;
  readonly replaced: number;
};

/** What a statement's balances say: it reconciles, it doesn't, or it has none. */
export type StatementBalance = "verified" | "unverified" | "none";
