import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteAccountAndData,
  deleteUserData,
  getProfileAccount,
} from "./user.service";

// The database side (cascades, Row-Level Security) is tested in packages/db;
// here, which steps run and in which order.
const mocks = vi.hoisted(() => ({
  steps: [] as string[],
  deleteUser: vi.fn(),
  getUser: vi.fn(),
  deleteAllUserData: vi.fn(),
  findUserId: vi.fn(),
  withUserContext: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    users: { deleteUser: mocks.deleteUser, getUser: mocks.getUser },
  }),
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

  it("throws a database error without the data its message quotes", async () => {
    const violation = Object.assign(new Error("violates foreign key"), {
      code: "23503",
      constraint: "transactions_covered_by_fk",
    });
    mocks.withUserContext.mockRejectedValue(
      new Error(`delete from "users" params: ${USER_ID}`, { cause: violation }),
    );

    await expect(deleteUserData("user_clerk")).rejects.toThrow(
      /^USER_DATA_NOT_DELETED: Error 23503 transactions_covered_by_fk$/,
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

describe("getProfileAccount", () => {
  // Invented: what Clerk's Backend API returns, among much else.
  const clerkUser = {
    fullName: "Ana Prueba",
    primaryEmailAddress: { emailAddress: "ana@example.com" },
    externalAccounts: [{ provider: "oauth_google" }],
    lastSignInAt: Date.UTC(2026, 9, 28, 13, 42),
  };

  beforeEach(() => {
    // 10:00 a. m. in Bogotá, the same day.
    vi.useFakeTimers({
      now: new Date("2026-10-28T15:00:00Z"),
      toFake: ["Date"],
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks Clerk for the session's user and keeps only what the profile shows", async () => {
    mocks.getUser.mockResolvedValue(clerkUser);

    expect(await getProfileAccount("user_clerk")).toEqual({
      name: "Ana Prueba",
      email: "ana@example.com",
      signsInWith: "google",
      lastSignIn: "hoy, 8:42 a. m.",
    });
    expect(mocks.getUser).toHaveBeenCalledWith("user_clerk");
  });

  it("leaves out a name Clerk doesn't have, and a sign-in it never saw", async () => {
    mocks.getUser.mockResolvedValue({
      ...clerkUser,
      fullName: null,
      externalAccounts: [],
      lastSignInAt: null,
    });

    expect(await getProfileAccount("user_clerk")).toEqual({
      name: null,
      email: "ana@example.com",
      signsInWith: "email",
      lastSignIn: null,
    });
  });
});
