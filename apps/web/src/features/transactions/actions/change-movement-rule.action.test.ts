import { beforeEach, describe, expect, it, vi } from "vitest";
import { changeMovementRule } from "./change-movement-rule.action";

const mocks = vi.hoisted(() => ({
  getSignedInClerkUserId: vi.fn(),
  updateMovementRules: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSignedInClerkUserId: mocks.getSignedInClerkUserId,
}));
vi.mock("../own-rules.service", () => ({
  updateMovementRules: mocks.updateMovementRules,
}));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));

const ACCOUNT = "3f1c6a52-6d3b-4c4e-9a53-1d2f0b7e8a90";
const MOVEMENT = "8b2d4f60-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

// The fields the detail's own block sends, with the intent its button carries.
const formOf = (intent: string): FormData => {
  const form = new FormData();
  form.set("account", ACCOUNT);
  form.set("movement", MOVEMENT);
  form.set("intent", intent);
  return form;
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSignedInClerkUserId.mockResolvedValue("user_clerk");
});

describe("changeMovementRule", () => {
  it("refuses a signed-out visitor and changes nothing", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue(null);

    await expect(changeMovementRule(null, formOf("mine"))).resolves.toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(mocks.updateMovementRules).not.toHaveBeenCalled();
  });

  it("refuses an intent it doesn't know, without changing or refreshing", async () => {
    await expect(
      changeMovementRule(null, formOf("delete_everything")),
    ).resolves.toEqual({ ok: false, error: { code: "INVALID_INPUT" } });
    expect(mocks.updateMovementRules).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("changes it for the session's user and refreshes the page", async () => {
    mocks.updateMovementRules.mockResolvedValue({
      ok: true,
      value: "undo_text",
    });

    await expect(
      changeMovementRule(null, formOf("undo_text")),
    ).resolves.toEqual({ ok: true, value: "undo_text" });
    expect(mocks.updateMovementRules).toHaveBeenCalledWith("user_clerk", {
      account: ACCOUNT,
      movement: MOVEMENT,
      intent: "undo_text",
    });
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("doesn't refresh when the service refuses", async () => {
    mocks.updateMovementRules.mockResolvedValue({
      ok: false,
      error: { code: "INVALID_INPUT" },
    });

    await changeMovementRule(null, formOf("undo_number"));

    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
