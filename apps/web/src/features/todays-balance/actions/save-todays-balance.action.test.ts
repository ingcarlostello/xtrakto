import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveTodaysBalance } from "./save-todays-balance.action";

const mocks = vi.hoisted(() => ({
  getSignedInClerkUserId: vi.fn(),
  keepTodaysBalance: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSignedInClerkUserId: mocks.getSignedInClerkUserId,
}));
vi.mock("../todays-balance.service", () => ({
  keepTodaysBalance: mocks.keepTodaysBalance,
}));

const ACCOUNT = "7d1e3c5a-2b4f-4e6a-8c9d-0e1f2a3b4c5d";
const INVALID = { ok: false, error: { code: "INVALID_INPUT" } };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSignedInClerkUserId.mockResolvedValue("user_clerk");
  mocks.keepTodaysBalance.mockResolvedValue({
    ok: true,
    value: { status: "off", differenceMinor: 5 },
  });
});

describe("saveTodaysBalance", () => {
  it("refuses a signed-out visitor and saves nothing", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue(null);

    expect(
      await saveTodaysBalance({ accountId: ACCOUNT, balance: "$90.000" }),
    ).toEqual({ ok: false, error: { code: "UNAUTHORIZED" } });
    expect(mocks.keepTodaysBalance).not.toHaveBeenCalled();
  });

  it.each([
    ["an account that isn't an id", { accountId: "x", balance: "90.000" }],
    ["nothing typed", { accountId: ACCOUNT, balance: "   " }],
    ["no balance", { accountId: ACCOUNT }],
    ["something else", "90.000"],
    ["too long a text", { accountId: ACCOUNT, balance: "9".repeat(41) }],
    ["what isn't an amount", { accountId: ACCOUNT, balance: "mucha plata" }],
    ["thousands the US way", { accountId: ACCOUNT, balance: "90,000" }],
  ])("refuses %s", async (_case, input) => {
    expect(await saveTodaysBalance(input)).toEqual(INVALID);
    expect(mocks.keepTodaysBalance).not.toHaveBeenCalled();
  });

  it.each([
    ["$7.818.518", 781_851_800],
    ["7.818.518,82", 781_851_882],
    ["7818518", 781_851_800],
  ])("keeps %s, as the session's user", async (balance, minor) => {
    const result = await saveTodaysBalance({ accountId: ACCOUNT, balance });

    expect(result).toEqual({
      ok: true,
      value: { status: "off", differenceMinor: 5 },
    });
    expect(mocks.keepTodaysBalance).toHaveBeenCalledWith(
      "user_clerk",
      ACCOUNT,
      minor,
    );
  });
});
