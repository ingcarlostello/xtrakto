import { beforeEach, describe, expect, it, vi } from "vitest";
import { removeOwnRule } from "./remove-own-rule.action";

const mocks = vi.hoisted(() => ({
  getSignedInClerkUserId: vi.fn(),
  deleteOwnRule: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSignedInClerkUserId: mocks.getSignedInClerkUserId,
}));
vi.mock("../user.service", () => ({ deleteOwnRule: mocks.deleteOwnRule }));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));

const RULE = "5c7e2a10-3b4d-4e6f-8a9b-0c1d2e3f4a5b";

// What the "×" sends: the rule's id.
const formOf = (rule: string): FormData => {
  const form = new FormData();
  form.set("rule", rule);
  return form;
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSignedInClerkUserId.mockResolvedValue("user_clerk");
});

describe("removeOwnRule", () => {
  it("refuses a signed-out visitor and undoes nothing", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue(null);

    await expect(removeOwnRule(null, formOf(RULE))).resolves.toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(mocks.deleteOwnRule).not.toHaveBeenCalled();
  });

  it("refuses what isn't a rule's id, without undoing or refreshing", async () => {
    await expect(removeOwnRule(null, formOf("1270"))).resolves.toEqual({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
    expect(mocks.deleteOwnRule).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("undoes it for the session's user and refreshes the page", async () => {
    mocks.deleteOwnRule.mockResolvedValue({ ok: true, value: undefined });

    await expect(removeOwnRule(null, formOf(RULE))).resolves.toEqual({
      ok: true,
      value: undefined,
    });
    expect(mocks.deleteOwnRule).toHaveBeenCalledWith("user_clerk", RULE);
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("passes on a rule that isn't the user's, without refreshing", async () => {
    mocks.deleteOwnRule.mockResolvedValue({
      ok: false,
      error: { code: "NOT_FOUND" },
    });

    await expect(removeOwnRule(null, formOf(RULE))).resolves.toEqual({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
