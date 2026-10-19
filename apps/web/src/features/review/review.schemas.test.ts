import { describe, expect, it } from "vitest";
import { answerReviewSchema, reviewSearchSchema } from "./review.schemas";

const ACCOUNT_ID = "3f8a1c2e-1234-4abc-9def-0123456789ab";
const ANSWER = {
  group: "key_platforms",
  answer: "investment",
  account: ACCOUNT_ID,
  period: "2026-q3",
};

describe("answerReviewSchema", () => {
  it("reads one of the group's own answers, for an account's quarter", () => {
    expect(answerReviewSchema.parse(ANSWER)).toEqual({
      ...ANSWER,
      period: { kind: "quarter", year: 2026, quarter: 3 },
    });
  });

  it.each([
    ["an answer of another group", { answer: "came_back" }],
    ["a group the review doesn't have", { group: "nequi" }],
    ["an answer the review doesn't have", { answer: "maybe" }],
    ["an inherited name as the answer", { answer: "toString" }],
    ["an account that isn't an id", { account: "8901" }],
    ["a period that doesn't parse", { period: "2026-q5" }],
    ["no period", { period: undefined }],
  ])("refuses %s", (_, change) => {
    expect(answerReviewSchema.safeParse({ ...ANSWER, ...change }).success).toBe(
      false,
    );
  });
});

describe("reviewSearchSchema", () => {
  it("reads the account and the period, and leaves out what doesn't parse", () => {
    expect(
      reviewSearchSchema.parse({ account: ACCOUNT_ID, period: "2026-08" }),
    ).toEqual({
      account: ACCOUNT_ID,
      period: { kind: "month", year: 2026, month: 8 },
    });
    expect(
      reviewSearchSchema.parse({ account: "8901", period: ["2026-q3"] }),
    ).toEqual({ account: undefined, period: undefined });
  });
});
