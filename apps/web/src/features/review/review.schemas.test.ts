import { describe, expect, it } from "vitest";
import {
  answerNumbersSchema,
  answerReviewSchema,
  reviewSearchSchema,
} from "./review.schemas";

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

describe("answerNumbersSchema", () => {
  const MINE = "a".repeat(64);
  const NUMBERS = {
    account: ACCOUNT_ID,
    period: "2026-q4",
    answer: "save",
    mine: [MINE],
  };
  const Q4 = { kind: "quarter", year: 2026, quarter: 4 };

  it("reads the numbers marked as the user's with Guardar", () => {
    expect(answerNumbersSchema.parse(NUMBERS)).toEqual({
      account: ACCOUNT_ID,
      period: Q4,
      mine: [MINE],
    });
  });

  it("marks none with Ninguno es mío, whatever the switches said", () => {
    expect(answerNumbersSchema.parse({ ...NUMBERS, answer: "none" })).toEqual({
      account: ACCOUNT_ID,
      period: Q4,
      mine: [],
    });
  });

  it.each([
    ["a number that isn't an HMAC", { mine: ["3001234567"] }],
    ["an HMAC in capitals", { mine: ["A".repeat(64)] }],
    ["more numbers than a quarter holds", { mine: Array(201).fill(MINE) }],
    ["another answer", { answer: "maybe" }],
    ["an account that isn't an id", { account: "8901" }],
    ["no period", { period: undefined }],
  ])("refuses %s", (_, change) => {
    expect(
      answerNumbersSchema.safeParse({ ...NUMBERS, ...change }).success,
    ).toBe(false);
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
