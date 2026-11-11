import { COLUMN_ROLE, MAX_SAMPLE_ROWS } from "@xtrakto/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { proposeFormatMapping } from "./propose-format-mapping.action";

const mocks = vi.hoisted(() => ({
  getSignedInClerkUserId: vi.fn(),
  proposeRolesFor: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSignedInClerkUserId: mocks.getSignedInClerkUserId,
}));
vi.mock("../mapping-proposal.service", () => ({
  proposeRolesFor: mocks.proposeRolesFor,
}));

const { DATE, DESCRIPTION, AMOUNT } = COLUMN_ROLE;
const ROW = ["99/99/9999", "AAAAAA AA AAAAAA", "-99.999,99"];
const SAMPLE = { header: ["FECHA", "DETALLE", "VALOR"], rows: [ROW] };
const INVALID = { ok: false, error: { code: "INVALID_INPUT" } };

// The input's type says it's a sample; the action checks it all the same.
const proposeAnything = (input: unknown) =>
  proposeFormatMapping(input as typeof SAMPLE);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSignedInClerkUserId.mockResolvedValue("user_clerk");
  mocks.proposeRolesFor.mockResolvedValue({
    ok: true,
    value: { roles: [DATE, DESCRIPTION, AMOUNT], model: "deepseek-flash" },
  });
});

describe("proposeFormatMapping", () => {
  it("refuses a signed-out visitor and asks nothing", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue(null);

    expect(await proposeFormatMapping(SAMPLE)).toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(mocks.proposeRolesFor).not.toHaveBeenCalled();
  });

  it.each([
    ["a date", [["15/03/2026", "AAAAAA", "-99.999,99"]]],
    ["a description", [["99/99/9999", "COMPRA EN TIENDA", "-99.999,99"]]],
    ["an amount", [["99/99/9999", "AAAAAA", "-85.400,00"]]],
    ["an accented letter", [["99/99/9999", "Débito", "-99.999,99"]]],
  ])("refuses a sample that holds %s of its file", async (_value, rows) => {
    expect(await proposeAnything({ ...SAMPLE, rows })).toEqual(INVALID);
    expect(mocks.proposeRolesFor).not.toHaveBeenCalled();
  });

  it.each([
    [
      "more rows than a sample shows",
      { ...SAMPLE, rows: Array(MAX_SAMPLE_ROWS + 1).fill(ROW) },
    ],
    [
      "a row without a shape for each column",
      { ...SAMPLE, rows: [ROW.slice(1)] },
    ],
    ["another field", { ...SAMPLE, file: "extracto.xlsx" }],
    ["something else", "FECHA;DETALLE;VALOR"],
  ])("refuses %s", async (_case, input) => {
    expect(await proposeAnything(input)).toEqual(INVALID);
    expect(mocks.proposeRolesFor).not.toHaveBeenCalled();
  });

  it("gives the session's user the roles proposed for the sample", async () => {
    expect(await proposeFormatMapping(SAMPLE)).toEqual({
      ok: true,
      value: { roles: [DATE, DESCRIPTION, AMOUNT] },
    });
    expect(mocks.proposeRolesFor).toHaveBeenCalledWith("user_clerk", SAMPLE);
  });

  it("gives back the AI's failure, for the person to map the columns", async () => {
    const failure = { ok: false, error: { code: "AI_OFF" } };
    mocks.proposeRolesFor.mockResolvedValue(failure);

    expect(await proposeFormatMapping(SAMPLE)).toEqual(failure);
  });
});
