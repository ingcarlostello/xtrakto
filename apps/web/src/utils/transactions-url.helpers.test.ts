import { periodSchema } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import {
  type MovementPeriod,
  parsePeriodParam,
  periodDays,
  periodOfStatement,
  periodParam,
  reviewHref,
  summaryHref,
  transactionsHref,
} from "./transactions-url.helpers";

const QUARTER: MovementPeriod = { kind: "quarter", year: 2026, quarter: 3 };
const AUGUST: MovementPeriod = { kind: "month", year: 2026, month: 8 };

describe("period params", () => {
  it.each([
    [QUARTER, "2026-q3"],
    [AUGUST, "2026-08"],
  ])("writes %o as %s and reads it back", (period, param) => {
    expect(periodParam(period)).toBe(param);
    expect(parsePeriodParam(param)).toEqual(period);
  });

  it.each(["2026-q5", "2026-13", "2026-8", "26-q3", "2026-Q3", "todo"])(
    "reads %s as no period",
    (param) => {
      expect(parsePeriodParam(param)).toBeUndefined();
    },
  );

  it("gives a period its days", () => {
    expect(periodDays(QUARTER)).toEqual({
      from: "2026-07-01",
      to: "2026-09-30",
    });
    expect(periodDays(AUGUST)).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
  });
});

describe("periodOfStatement", () => {
  it.each([
    {
      file: "a quarterly statement",
      days: { from: "2026-06-30", to: "2026-09-30" },
      expected: QUARTER,
    },
    {
      file: "an export within a month",
      days: { from: "2026-08-01", to: "2026-08-15" },
      expected: AUGUST,
    },
    {
      file: "an export across months",
      days: { from: "2026-07-20", to: "2026-08-15" },
      expected: QUARTER,
    },
    {
      file: "an export across quarters",
      days: { from: "2026-09-20", to: "2026-10-10" },
      expected: { kind: "quarter", year: 2026, quarter: 4 },
    },
  ])("shows $file in its period", ({ days, expected }) => {
    expect(periodOfStatement(periodSchema.parse(days))).toEqual(expected);
  });
});

describe("transactionsHref", () => {
  it("names the account, the period, the search, the filter, how many show and the movement detailed", () => {
    expect(
      transactionsHref({
        accountId: "a1",
        period: QUARTER,
        search: "nequi",
        filter: "moved",
        shown: 60,
        movementId: "m1",
      }),
    ).toEqual({
      pathname: "/transactions",
      query: {
        account: "a1",
        period: "2026-q3",
        q: "nequi",
        filter: "moved",
        show: 60,
        movement: "m1",
      },
    });
  });

  it("opens another account on its latest quarter", () => {
    expect(transactionsHref({ accountId: "a2" })).toEqual({
      pathname: "/transactions",
      query: { account: "a2" },
    });
  });

  it("leaves out the account and the count when not given", () => {
    expect(transactionsHref({ period: AUGUST })).toEqual({
      pathname: "/transactions",
      query: { period: "2026-08" },
    });
  });
});

describe("reviewHref", () => {
  it("links to the review of the account's quarter", () => {
    expect(reviewHref({ accountId: "a1", period: QUARTER })).toEqual({
      pathname: "/review",
      query: { account: "a1", period: "2026-q3" },
    });
  });
});

describe("summaryHref", () => {
  it("links to the summary of an account's period, or the latest", () => {
    expect(summaryHref({ accountId: "a1", period: QUARTER })).toEqual({
      pathname: "/",
      query: { account: "a1", period: "2026-q3" },
    });
    expect(summaryHref({})).toEqual({ pathname: "/", query: {} });
  });
});
