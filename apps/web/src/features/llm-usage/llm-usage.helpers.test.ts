import { describe, expect, it } from "vitest";
import { crossesAlert, limitReached, usageRowsOf } from "./llm-usage.helpers";

describe("limitReached", () => {
  it("lets a call through while both months stay under their limits", () => {
    expect(
      limitReached({ user: 999_999, platform: 2_999_999 }),
    ).toBeUndefined();
  });

  it("stops a user whose month reached USD 1", () => {
    expect(limitReached({ user: 1_000_000, platform: 0 })).toBe("USER_MONTH");
  });

  it("stops every call once the platform's month reached its USD 3", () => {
    expect(limitReached({ user: 0, platform: 3_000_000 })).toBe(
      "PLATFORM_BUDGET",
    );
  });

  it("names the user's limit when both are reached", () => {
    expect(limitReached({ user: 1_000_000, platform: 3_000_000 })).toBe(
      "USER_MONTH",
    );
  });
});

describe("crossesAlert", () => {
  it.each([
    { case: "lands on 80%", after: 2_400_000, cost: 1, crosses: true },
    { case: "jumps past 80%", after: 3_100_000, cost: 800_000, crosses: true },
    { case: "stays under 80%", after: 2_399_999, cost: 10, crosses: false },
    { case: "starts at 80%", after: 2_420_000, cost: 20_000, crosses: false },
    {
      case: "was past 80% already",
      after: 2_500_000,
      cost: 50_000,
      crosses: false,
    },
  ])("is $crosses when the call $case", ({ after, cost, crosses }) => {
    expect(crossesAlert(after, cost)).toBe(crosses);
  });
});

describe("usageRowsOf", () => {
  it("keeps one row per attempt, and nothing spent when DeepSeek didn't say", () => {
    expect(
      usageRowsOf({
        prompt: { name: "categorize", version: 2 },
        attempts: [
          {
            model: "deepseek-flash",
            outcome: "TIMEOUT",
            startedAt: 1,
            endedAt: 2,
          },
          {
            model: "deepseek-v4-pro",
            outcome: "OK",
            startedAt: 2,
            endedAt: 3,
            usage: { inputTokens: 40, outputTokens: 12, costMicroUsd: 101 },
          },
        ],
      }),
    ).toEqual([
      {
        promptName: "categorize",
        promptVersion: 2,
        model: "deepseek-flash",
        outcome: "TIMEOUT",
        inputTokens: null,
        outputTokens: null,
        costMicroUsd: 0,
      },
      {
        promptName: "categorize",
        promptVersion: 2,
        model: "deepseek-v4-pro",
        outcome: "OK",
        inputTokens: 40,
        outputTokens: 12,
        costMicroUsd: 101,
      },
    ]);
  });
});
