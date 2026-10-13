import { beforeEach, describe, expect, it, vi } from "vitest";
import { listUploadAccounts } from "./upload.service";

// Row-Level Security and the query are tested in packages/db; here, whose
// accounts are read and that reading never creates a user.
const mocks = vi.hoisted(() => ({
  findUserId: vi.fn(),
  listAccounts: vi.fn(),
  withUserContext: vi.fn(),
}));

vi.mock("@xtrakto/db", () => ({
  findUserId: mocks.findUserId,
  listAccounts: mocks.listAccounts,
  withUserContext: mocks.withUserContext,
}));
vi.mock("@/lib/db", () => ({ getDb: () => "db" }));

const USER_ID = "0b6f1d2e-58c4-4c31-9a59-6a3f0f5c2e11";
const ACCOUNTS = [
  { id: "a", bankId: "bancolombia", accountType: "savings", last4: "8901" },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe("listUploadAccounts", () => {
  it("reads the accounts in the signed-in user's own context", async () => {
    mocks.findUserId.mockResolvedValue(USER_ID);
    mocks.withUserContext.mockResolvedValue(ACCOUNTS);

    expect(await listUploadAccounts("user_clerk")).toEqual(ACCOUNTS);
    expect(mocks.findUserId).toHaveBeenCalledWith("db", "user_clerk");
    expect(mocks.withUserContext).toHaveBeenCalledWith(
      "db",
      USER_ID,
      mocks.listAccounts,
    );
  });

  it("has no accounts for someone who never sent a file", async () => {
    mocks.findUserId.mockResolvedValue(undefined);

    expect(await listUploadAccounts("user_new")).toEqual([]);
    expect(mocks.withUserContext).not.toHaveBeenCalled();
  });
});
