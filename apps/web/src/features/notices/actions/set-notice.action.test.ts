import { beforeEach, describe, expect, it, vi } from "vitest";
import { setNotice } from "./set-notice.action";

const mocks = vi.hoisted(() => ({
  getSignedInClerkUserId: vi.fn(),
  setNoticePreference: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  getSignedInClerkUserId: mocks.getSignedInClerkUserId,
}));
vi.mock("../notices.service", () => ({
  setNoticePreference: mocks.setNoticePreference,
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSignedInClerkUserId.mockResolvedValue("user_clerk");
});

describe("setNotice", () => {
  it("refuses a signed-out visitor and changes nothing", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue(null);

    await expect(
      setNotice({ notice: "uploadReady", isOn: false }),
    ).resolves.toEqual({ ok: false, error: { code: "UNAUTHORIZED" } });
    expect(mocks.setNoticePreference).not.toHaveBeenCalled();
  });

  it.each([
    [{ notice: "uploadReady" }],
    [{ notice: "nothing", isOn: true }],
    [{ notice: "uploadReady", isOn: "no" }],
    [{ notice: "uploadReady", isOn: true, userId: "someone" }],
  ])("refuses %j", async (input) => {
    await expect(setNotice(input)).resolves.toEqual({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });
    expect(mocks.setNoticePreference).not.toHaveBeenCalled();
  });

  it("changes the session's user's notice", async () => {
    await expect(
      setNotice({ notice: "uploadReady", isOn: false }),
    ).resolves.toEqual({ ok: true, value: undefined });
    expect(mocks.setNoticePreference).toHaveBeenCalledWith(
      "user_clerk",
      "uploadReady",
      false,
    );
  });
});
