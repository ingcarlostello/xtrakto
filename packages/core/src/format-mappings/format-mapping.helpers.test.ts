import { describe, expect, it } from "vitest";
import { COLUMN_ROLE } from "./format-mapping.constants";
import {
  columnRolesProblem,
  formatFingerprint,
} from "./format-mapping.helpers";

const HEADER = ["FECHA TRANS", "DETALLE", "DEBITOS", "CREDITOS", "SALDO"];

const {
  DATE,
  DESCRIPTION,
  AMOUNT,
  MONEY_OUT,
  MONEY_IN,
  BALANCE,
  REFERENCE,
  DIRECTION,
  NONE,
} = COLUMN_ROLE;

describe("columnRolesProblem", () => {
  it.each([
    [DATE, DESCRIPTION, AMOUNT],
    [DATE, NONE, DESCRIPTION, MONEY_OUT, MONEY_IN, BALANCE],
    [DIRECTION, DATE, DESCRIPTION, REFERENCE, AMOUNT],
  ])("reads money one way with %j", (...columns) => {
    expect(columnRolesProblem(columns)).toBeUndefined();
  });

  it.each([
    { problem: "one date column", columns: [DATE, DATE, DESCRIPTION, AMOUNT] },
    { problem: "one description column", columns: [DATE, NONE, AMOUNT] },
    {
      problem: "one balance column at most",
      columns: [DATE, DESCRIPTION, AMOUNT, BALANCE, BALANCE],
    },
    {
      problem: "one reference column at most",
      columns: [DATE, DESCRIPTION, REFERENCE, AMOUNT, REFERENCE],
    },
    {
      problem: "money read one way",
      columns: [DATE, DESCRIPTION, AMOUNT, MONEY_OUT, MONEY_IN],
    },
    { problem: "money read one way", columns: [DATE, DESCRIPTION, MONEY_IN] },
    { problem: "money read one way", columns: [DATE, DESCRIPTION, DIRECTION] },
  ])("says $problem", ({ problem, columns }) => {
    expect(columnRolesProblem(columns)).toBe(problem);
  });
});

describe("formatFingerprint", () => {
  it("gives a header 64 hex characters, the same each time", async () => {
    const fingerprint = await formatFingerprint(HEADER);

    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(await formatFingerprint([...HEADER])).toBe(fingerprint);
  });

  it.each([
    { change: "another name", header: HEADER.with(1, "DESCRIPCION") },
    { change: "another order", header: HEADER.toReversed() },
    { change: "one name less", header: HEADER.slice(1) },
    {
      change: "two names as one, with the same letters",
      header: ["FECHA TRANSDETALLE", ...HEADER.slice(2)],
    },
    { change: "an empty name more", header: [...HEADER, ""] },
  ])("tells apart a header with $change", async ({ header }) => {
    expect(await formatFingerprint(header)).not.toBe(
      await formatFingerprint(HEADER),
    );
  });
});
