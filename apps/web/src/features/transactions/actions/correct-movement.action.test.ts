import { beforeEach, describe, expect, it, vi } from "vitest";
import { correctMovement } from "./correct-movement.action";

const mocks = vi.hoisted(() => ({
  getSignedInClerkUserId: vi.fn(),
  correctMovementCategory: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSignedInClerkUserId: mocks.getSignedInClerkUserId,
}));
vi.mock("../correction.service", () => ({
  correctMovementCategory: mocks.correctMovementCategory,
}));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));

const ACCOUNT = "3f1c6a52-6d3b-4c4e-9a53-1d2f0b7e8a90";
const MOVEMENT = "8b2d4f60-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

// The fields the detail's form sends, with the scope its button carries.
const formOf = (fields: Readonly<Record<string, string>>): FormData => {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return form;
};

const CORRECTION = {
  account: ACCOUNT,
  movement: MOVEMENT,
  kind: "internal",
  category: "investment",
  scope: "movement",
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSignedInClerkUserId.mockResolvedValue("user_clerk");
});

describe("correctMovement", () => {
  it("refuses a signed-out visitor and corrects nothing", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue(null);

    await expect(correctMovement(null, formOf(CORRECTION))).resolves.toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(mocks.correctMovementCategory).not.toHaveBeenCalled();
  });

  it("refuses a category the table doesn't have, without correcting or refreshing", async () => {
    await expect(
      correctMovement(null, formOf({ ...CORRECTION, category: "anything" })),
    ).resolves.toEqual({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(mocks.correctMovementCategory).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("corrects for the session's user and refreshes the page", async () => {
    const saved = { scope: "movement", category: "investment" };
    mocks.correctMovementCategory.mockResolvedValue({ ok: true, value: saved });

    await expect(correctMovement(null, formOf(CORRECTION))).resolves.toEqual({
      ok: true,
      value: saved,
    });
    expect(mocks.correctMovementCategory).toHaveBeenCalledWith("user_clerk", {
      account: ACCOUNT,
      movement: MOVEMENT,
      category: "investment",
      scope: "movement",
    });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("doesn't refresh when the service refuses", async () => {
    mocks.correctMovementCategory.mockResolvedValue({
      ok: false,
      error: { code: "NOT_FOUND" },
    });

    await expect(correctMovement(null, formOf(CORRECTION))).resolves.toEqual({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
