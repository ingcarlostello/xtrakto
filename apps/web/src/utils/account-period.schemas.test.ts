import { describe, expect, it } from "vitest";
import {
  accountPagePeriodSearchSchema,
  accountPeriodSearchSchema,
} from "./account-period.schemas";

const ACCOUNT_ID = "3f8a1c2e-1234-4abc-9def-0123456789ab";

describe("accountPeriodSearchSchema", () => {
  it("reads the account and the period, and leaves out what doesn't parse", () => {
    expect(
      accountPeriodSearchSchema.parse({
        account: ACCOUNT_ID,
        period: "2026-08",
      }),
    ).toEqual({
      account: ACCOUNT_ID,
      period: { kind: "month", year: 2026, month: 8 },
    });
    expect(
      accountPeriodSearchSchema.parse({ account: "8901", period: ["2026-q3"] }),
    ).toEqual({ account: undefined, period: undefined });
  });

  it("reads a year only where the page offers years", () => {
    expect(accountPeriodSearchSchema.parse({ period: "2026" })).toEqual({
      account: undefined,
      period: undefined,
    });
    expect(accountPagePeriodSearchSchema.parse({ period: "2026" })).toEqual({
      account: undefined,
      period: { kind: "year", year: 2026 },
    });
    expect(
      accountPagePeriodSearchSchema.parse({ period: "2026-08" }).period,
    ).toEqual({ kind: "month", year: 2026, month: 8 });
  });
});
