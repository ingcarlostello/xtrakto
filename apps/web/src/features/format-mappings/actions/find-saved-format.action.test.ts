import { beforeEach, describe, expect, it, vi } from "vitest";
import { findSavedFormat } from "./find-saved-format.action";

const mocks = vi.hoisted(() => ({
  getSignedInClerkUserId: vi.fn(),
  findSavedMapping: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSignedInClerkUserId: mocks.getSignedInClerkUserId,
}));
vi.mock("../saved-format.service", () => ({
  findSavedMapping: mocks.findSavedMapping,
}));

const HEADER = ["FECHA", "DETALLE", "VALOR"];
const MAPPING = { header: HEADER, columns: ["date", "description", "amount"] };
const INVALID = { ok: false, error: { code: "INVALID_INPUT" } };

// The input's type says it's a header; the action checks it all the same.
const findAnything = (input: unknown) =>
  findSavedFormat(input as readonly string[]);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSignedInClerkUserId.mockResolvedValue("user_clerk");
  mocks.findSavedMapping.mockResolvedValue(MAPPING);
});

describe("findSavedFormat", () => {
  it("refuses a signed-out visitor and looks nothing up", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue(null);

    expect(await findSavedFormat(HEADER)).toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(mocks.findSavedMapping).not.toHaveBeenCalled();
  });

  it.each([
    ["no names", []],
    ["a name that isn't text", ["FECHA", 7]],
    ["a name too long", ["FECHA", "A".repeat(501)]],
    ["more names than a row has", Array(51).fill("FECHA")],
    ["something else", "FECHA;DETALLE"],
  ])("refuses %s", async (_case, input) => {
    expect(await findAnything(input)).toEqual(INVALID);
    expect(mocks.findSavedMapping).not.toHaveBeenCalled();
  });

  it("gives the session's user the mapping saved for the header", async () => {
    expect(await findSavedFormat(HEADER)).toEqual({
      ok: true,
      value: { mapping: MAPPING },
    });
    expect(mocks.findSavedMapping).toHaveBeenCalledWith("user_clerk", HEADER);
  });

  it("says when no mapping is saved for it", async () => {
    mocks.findSavedMapping.mockResolvedValue(undefined);

    expect(await findSavedFormat(HEADER)).toEqual({
      ok: true,
      value: { mapping: null },
    });
  });
});
