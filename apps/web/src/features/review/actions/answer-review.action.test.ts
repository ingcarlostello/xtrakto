import { beforeEach, describe, expect, it, vi } from "vitest";
import { answerReview } from "./answer-review.action";

const mocks = vi.hoisted(() => ({
  getSignedInClerkUserId: vi.fn(),
  answerReviewGroup: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSignedInClerkUserId: mocks.getSignedInClerkUserId,
}));
vi.mock("../review.service", () => ({
  answerReviewGroup: mocks.answerReviewGroup,
}));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));

const ACCOUNT_ID = "3f8a1c2e-1234-4abc-9def-0123456789ab";

// The fields a group's form sends, with the answer its button carries.
const formOf = (fields: Readonly<Record<string, string>>): FormData => {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return form;
};

const ANSWER = {
  group: "key_people",
  answer: "purchase",
  account: ACCOUNT_ID,
  period: "2026-q3",
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSignedInClerkUserId.mockResolvedValue("user_clerk");
});

describe("answerReview", () => {
  it("refuses a signed-out visitor and answers nothing", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue(null);

    await expect(answerReview(null, formOf(ANSWER))).resolves.toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(mocks.answerReviewGroup).not.toHaveBeenCalled();
  });

  it("refuses an answer the group doesn't offer, without answering or refreshing", async () => {
    await expect(
      answerReview(null, formOf({ ...ANSWER, answer: "came_back" })),
    ).resolves.toEqual({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(mocks.answerReviewGroup).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("answers for the session's user and refreshes the page", async () => {
    mocks.answerReviewGroup.mockResolvedValue({ ok: true, value: null });

    await expect(answerReview(null, formOf(ANSWER))).resolves.toEqual({
      ok: true,
      value: null,
    });
    expect(mocks.answerReviewGroup).toHaveBeenCalledWith("user_clerk", {
      ...ANSWER,
      period: { kind: "quarter", year: 2026, quarter: 3 },
    });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("returns what failed without refreshing", async () => {
    const notFound = { ok: false, error: { code: "NOT_FOUND" } };
    mocks.answerReviewGroup.mockResolvedValue(notFound);

    await expect(answerReview(null, formOf(ANSWER))).resolves.toEqual(notFound);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
