import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAccount } from "./delete-account.action";

const mocks = vi.hoisted(() => ({
  getSignedInClerkUserId: vi.fn(),
  deleteAccountAndData: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSignedInClerkUserId: mocks.getSignedInClerkUserId,
}));
vi.mock("../user.service", () => ({
  deleteAccountAndData: mocks.deleteAccountAndData,
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("deleteAccount", () => {
  it("refuses a signed-out visitor and deletes nothing", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue(null);

    await expect(deleteAccount()).resolves.toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(mocks.deleteAccountAndData).not.toHaveBeenCalled();
  });

  it("deletes the account of the session's user", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue("user_clerk");

    await expect(deleteAccount()).resolves.toEqual({ ok: true, value: null });
    expect(mocks.deleteAccountAndData).toHaveBeenCalledWith("user_clerk");
  });
});
