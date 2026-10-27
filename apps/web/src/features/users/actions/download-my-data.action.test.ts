import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadMyData } from "./download-my-data.action";

const mocks = vi.hoisted(() => ({
  getSignedInClerkUserId: vi.fn(),
  getMyDataCsv: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSignedInClerkUserId: mocks.getSignedInClerkUserId,
}));
vi.mock("../user.service", () => ({ getMyDataCsv: mocks.getMyDataCsv }));

const FILE = { fileName: "xtrakto-mis-datos-2026-10-27.csv", content: "csv" };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("downloadMyData", () => {
  it("refuses a signed-out visitor and reads nothing", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue(null);

    await expect(downloadMyData()).resolves.toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(mocks.getMyDataCsv).not.toHaveBeenCalled();
  });

  it("exports the data of the session's user only", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue("user_clerk");
    mocks.getMyDataCsv.mockResolvedValue(FILE);

    await expect(downloadMyData()).resolves.toEqual({ ok: true, value: FILE });
    expect(mocks.getMyDataCsv).toHaveBeenCalledWith("user_clerk");
  });
});
