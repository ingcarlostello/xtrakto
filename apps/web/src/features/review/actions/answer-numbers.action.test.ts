import { beforeEach, describe, expect, it, vi } from "vitest";
import { answerNumbers } from "./answer-numbers.action";

const mocks = vi.hoisted(() => ({
  getSignedInClerkUserId: vi.fn(),
  answerReviewNumbers: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSignedInClerkUserId: mocks.getSignedInClerkUserId,
}));
vi.mock("../review.service", () => ({
  answerReviewNumbers: mocks.answerReviewNumbers,
}));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));

const ACCOUNT_ID = "3f8a1c2e-1234-4abc-9def-0123456789ab";
const FIRST = "a".repeat(64);
const SECOND = "b".repeat(64);
const Q4 = { kind: "quarter", year: 2026, quarter: 4 };

// What the numbers' form sends: the button's answer, and each switch on as
// one more `mine`.
const formOf = (answer: string, mine: readonly string[]): FormData => {
  const form = new FormData();
  form.set("account", ACCOUNT_ID);
  form.set("period", "2026-q4");
  form.set("answer", answer);
  for (const number of mine) form.append("mine", number);
  return form;
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSignedInClerkUserId.mockResolvedValue("user_clerk");
  mocks.answerReviewNumbers.mockResolvedValue({ ok: true, value: null });
});

describe("answerNumbers", () => {
  it("refuses a signed-out visitor and marks nothing", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue(null);

    await expect(answerNumbers(null, formOf("save", [FIRST]))).resolves.toEqual(
      { ok: false, error: { code: "UNAUTHORIZED" } },
    );
    expect(mocks.answerReviewNumbers).not.toHaveBeenCalled();
  });

  it("refuses a number that isn't an HMAC, without answering or refreshing", async () => {
    await expect(
      answerNumbers(null, formOf("save", ["3001234567"])),
    ).resolves.toEqual({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(mocks.answerReviewNumbers).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("marks every switch that was on, for the session's user, and refreshes the page", async () => {
    await expect(
      answerNumbers(null, formOf("save", [FIRST, SECOND])),
    ).resolves.toEqual({ ok: true, value: null });
    expect(mocks.answerReviewNumbers).toHaveBeenCalledWith("user_clerk", {
      account: ACCOUNT_ID,
      period: Q4,
      mine: [FIRST, SECOND],
    });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("marks none with Ninguno es mío", async () => {
    await answerNumbers(null, formOf("none", [FIRST]));

    expect(mocks.answerReviewNumbers).toHaveBeenCalledWith("user_clerk", {
      account: ACCOUNT_ID,
      period: Q4,
      mine: [],
    });
  });

  it("returns what failed without refreshing", async () => {
    const notFound = { ok: false, error: { code: "NOT_FOUND" } };
    mocks.answerReviewNumbers.mockResolvedValue(notFound);

    await expect(answerNumbers(null, formOf("save", []))).resolves.toEqual(
      notFound,
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
