import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadMovements } from "./download-movements.action";

const mocks = vi.hoisted(() => ({
  getSignedInClerkUserId: vi.fn(),
  getMovementsCsv: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSignedInClerkUserId: mocks.getSignedInClerkUserId,
}));
vi.mock("../transaction.service", () => ({
  getMovementsCsv: mocks.getMovementsCsv,
}));

const ACCOUNT = "0192d1c4-0000-7000-8000-000000000001";
const FILE = {
  fileName: "xtrakto-movimientos-2026-07-01-a-2026-09-30.csv",
  content: "csv",
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("downloadMovements", () => {
  it("refuses a signed-out visitor and reads nothing", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue(null);

    await expect(downloadMovements({ account: ACCOUNT })).resolves.toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(mocks.getMovementsCsv).not.toHaveBeenCalled();
  });

  it("refuses input that isn't the page's search params", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue("user_clerk");

    await expect(downloadMovements("account=x")).resolves.toEqual({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
    expect(mocks.getMovementsCsv).not.toHaveBeenCalled();
  });

  it("exports what the list shows, for the session's user, without its lines or detail", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue("user_clerk");
    mocks.getMovementsCsv.mockResolvedValue(FILE);

    await expect(
      downloadMovements({
        account: ACCOUNT,
        q: "nequi",
        filter: "review",
        show: "60",
        movement: ACCOUNT,
      }),
    ).resolves.toEqual({ ok: true, value: FILE });
    expect(mocks.getMovementsCsv).toHaveBeenCalledWith("user_clerk", {
      accountId: ACCOUNT,
      search: "nequi",
      filter: "review",
    });
  });

  it("says when the list would show nothing", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue("user_clerk");
    mocks.getMovementsCsv.mockResolvedValue(null);

    await expect(downloadMovements({})).resolves.toEqual({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
  });
});
