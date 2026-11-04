import { periodSchema } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { reviewHref, transactionsHref } from "@/utils/transactions-url.helpers";
import { nextStepOf, reviewQuarterOf } from "./next-step.helpers";
import type { JobOutcome, UploadJob } from "./upload.types";

const QUARTER = periodSchema.parse({ from: "2026-06-30", to: "2026-09-30" });
const AUGUST_1_TO_15 = periodSchema.parse({
  from: "2026-08-01",
  to: "2026-08-15",
});
const SEPTEMBER_15_TO_OCTOBER_5 = periodSchema.parse({
  from: "2026-09-15",
  to: "2026-10-05",
});

const done = (
  jobId: string,
  outcome: Partial<JobOutcome> & Pick<JobOutcome, "period">,
): UploadJob => ({
  jobId,
  status: "done",
  isSlow: false,
  outcome: {
    stats: {
      total: 1,
      added: 1,
      skipped: 0,
      covered: 0,
      hidden: 0,
      replaced: 0,
    },
    statementId: `s-${jobId}`,
    accountId: "a1",
    balance: "none",
    matches: { matched: 0, dayApart: 0, references: 0, verifiedBy: [] },
    ...outcome,
  },
});

describe("reviewQuarterOf", () => {
  it("gives the quarter of a statement's last day", () => {
    expect(reviewQuarterOf(QUARTER)).toEqual({
      kind: "quarter",
      year: 2026,
      quarter: 3,
    });
    expect(reviewQuarterOf(SEPTEMBER_15_TO_OCTOBER_5)).toEqual({
      kind: "quarter",
      year: 2026,
      quarter: 4,
    });
  });
});

describe("nextStepOf", () => {
  it("leads to the review of the quarter whose movements wait, and to the file's movements", () => {
    const step = nextStepOf([
      done("j1", { period: AUGUST_1_TO_15, toReview: 24 }),
    ]);

    expect(step).toEqual({
      title: "24 movimientos por revisar en jul–sep 2026",
      reviewHref: reviewHref({
        accountId: "a1",
        period: { kind: "quarter", year: 2026, quarter: 3 },
      }),
      movementsHref: transactionsHref({
        accountId: "a1",
        period: { kind: "month", year: 2026, month: 8 },
      }),
    });
  });

  it("follows the last file done whose quarter has something to review", () => {
    const step = nextStepOf([
      done("j1", { period: AUGUST_1_TO_15, toReview: 24 }),
      done("j2", { period: SEPTEMBER_15_TO_OCTOBER_5, toReview: 1 }),
      done("j3", { period: QUARTER, toReview: 0 }),
      { jobId: "j4", status: "processing", isSlow: false },
    ]);

    expect(step?.title).toBe("1 movimiento por revisar en oct–dic 2026");
  });

  it("follows nothing when no quarter waits for review", () => {
    expect(nextStepOf([])).toBeUndefined();
    expect(nextStepOf([done("j1", { period: QUARTER })])).toBeUndefined();
    expect(
      nextStepOf([done("j1", { period: QUARTER, toReview: 0 })]),
    ).toBeUndefined();
  });
});
