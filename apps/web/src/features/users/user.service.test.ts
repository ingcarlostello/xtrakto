import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAccountAndData, deleteUserData } from "./user.service";

// The database side (cascades, Row-Level Security) is tested in packages/db;
// here, which steps run and in which order.
const mocks = vi.hoisted(() => ({
  steps: [] as string[],
  deleteUser: vi.fn(),
  deleteAllUserData: vi.fn(),
  findUserId: vi.fn(),
  withUserContext: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({ users: { deleteUser: mocks.deleteUser } }),
}));
vi.mock("@xtrakto/db", () => ({
  deleteAllUserData: mocks.deleteAllUserData,
  findUserId: mocks.findUserId,
  withUserContext: mocks.withUserContext,
}));
vi.mock("@/lib/db", () => ({ getDb: () => "db" }));

const USER_ID = "0b6f1d2e-58c4-4c31-9a59-6a3f0f5c2e11";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.steps.length = 0;
  mocks.findUserId.mockResolvedValue(USER_ID);
  mocks.withUserContext.mockImplementation(async () => {
    mocks.steps.push("data");
    return true;
  });
  mocks.deleteUser.mockImplementation(async () => {
    mocks.steps.push("clerk");
  });
});

describe("deleteUserData", () => {
  it("deletes the user's rows from their own context", async () => {
    await deleteUserData("user_clerk");

    expect(mocks.findUserId).toHaveBeenCalledWith("db", "user_clerk");
    expect(mocks.withUserContext).toHaveBeenCalledWith(
      "db",
      USER_ID,
      mocks.deleteAllUserData,
    );
  });

  it("does nothing for a Clerk user who never used the app", async () => {
    mocks.findUserId.mockResolvedValue(undefined);

    await deleteUserData("user_clerk");

    expect(mocks.withUserContext).not.toHaveBeenCalled();
  });
});

describe("deleteAccountAndData", () => {
  it("deletes the data before the Clerk user", async () => {
    await deleteAccountAndData("user_clerk");

    expect(mocks.steps).toEqual(["data", "clerk"]);
    expect(mocks.deleteUser).toHaveBeenCalledWith("user_clerk");
  });

  it("keeps the Clerk user when the data can't be deleted, so the user can retry", async () => {
    mocks.withUserContext.mockRejectedValue(new Error("database down"));

    await expect(deleteAccountAndData("user_clerk")).rejects.toThrow();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("fails when Clerk fails, after the data is gone", async () => {
    mocks.deleteUser.mockRejectedValue(new Error("Clerk unavailable"));

    await expect(deleteAccountAndData("user_clerk")).rejects.toThrow();
    expect(mocks.steps).toEqual(["data"]);
  });
});
