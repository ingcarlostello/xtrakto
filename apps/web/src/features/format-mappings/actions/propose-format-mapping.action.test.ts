import { COLUMN_ROLE, MAX_SAMPLE_ROWS } from "@xtrakto/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MappingRetry } from "../mapping-retry.schemas";
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

describe("proposeFormatMapping, a second time (11.4)", () => {
  const RETRY: MappingRetry = {
    roles: [DATE, DESCRIPTION, AMOUNT],
    failure: { kind: "balances_break", percent: 40 },
  };

  // The retry's type says it's codes; the action checks it all the same.
  const proposeAgain = (retry: unknown) =>
    proposeFormatMapping(SAMPLE, retry as MappingRetry);

  it("asks again with the roles before and what failed", async () => {
    expect(await proposeFormatMapping(SAMPLE, RETRY)).toMatchObject({
      ok: true,
    });
    expect(mocks.proposeRolesFor).toHaveBeenCalledWith(
      "user_clerk",
      SAMPLE,
      RETRY,
    );
  });

  it.each([
    [
      "a value of the file",
      { ...RETRY, failure: { ...RETRY.failure, cell: "-85.400,00" } },
    ],
    ["another field", { ...RETRY, sample: SAMPLE }],
    ["a role more", { ...RETRY, roles: [...RETRY.roles, AMOUNT] }],
    ["a role no table has", { ...RETRY, roles: [DATE, DESCRIPTION, "fee"] }],
    [
      "a column the sample doesn't have",
      { ...RETRY, failure: { kind: "unread", column: 4, cause: "date" } },
    ],
    [
      "a cause it doesn't know",
      { ...RETRY, failure: { kind: "unread", column: 1, cause: "COMPRA" } },
    ],
    [
      "a share past every row",
      { ...RETRY, failure: { kind: "balances_break", percent: 140 } },
    ],
    ["something else", "the balance broke at $85.400"],
  ])("refuses a retry with %s, and asks nothing", async (_case, retry) => {
    expect(await proposeAgain(retry)).toEqual(INVALID);
    expect(mocks.proposeRolesFor).not.toHaveBeenCalled();
  });
});
