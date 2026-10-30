import {
  amountMinorSchema,
  localDateSchema,
  periodSchema,
} from "@xtrakto/core";
import type { StatementBreaks } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import {
  breakMarks,
  breaksSummary,
  breaksTitle,
  FIRST_BREAK_ANCHOR,
  statementName,
  unreconciledText,
} from "./balance-breaks.helpers";

const QUARTER = periodSchema.parse({ from: "2026-06-30", to: "2026-09-30" });
const amount = (value: number) => amountMinorSchema.parse(value);

// The bank's balances after each movement, oldest first: the second one
// prints $9.000 where $10.000 − $500 makes $9.500, and the third follows it.
const movement = (position: number, change: number, balance: number) => ({
  id: `m${position}`,
  position,
  date: localDateSchema.parse("2026-07-01"),
  descriptionRaw: "COMPRA EN TIENDA",
  amountMinor: amount(change),
  balanceAfterMinor: amount(balance),
  categoryId: null,
  categoryRuleId: null,
  isPendingReview: false,
  llmTitle: null,
});

const breaks = (breakPositions: number[]): StatementBreaks => ({
  statement: {
    id: "s1",
    accountId: "a1",
    period: QUARTER,
    differenceMinor: amount(-50_000),
    openingBalanceMinor: amount(1_100_000),
    breakPositions,
  },
  account: {
    id: "a1",
    bankId: "bancolombia",
    accountType: "savings",
    last4: "8901",
  },
  movements: [
    movement(2, -100_000, 800_000),
    movement(1, -50_000, 900_000),
    movement(0, -100_000, 1_000_000),
  ],
});

describe("breakMarks", () => {
  it("says what the broken row should have printed, from the printed balance before it", () => {
    expect(breakMarks(breaks([1])).get("m1")).toEqual({
      note: "Con el saldo anterior ($10.000) y este movimiento quedaría $9.500; el banco dice $9.000.",
      anchor: FIRST_BREAK_ANCHOR,
    });
  });

  it("starts from the opening balance on the first row", () => {
    expect(breakMarks(breaks([0])).get("m0")?.note).toBe(
      "Con el saldo anterior ($11.000) y este movimiento quedaría $10.000; el banco dice $10.000.",
    );
  });

  it("puts the jump link on the first broken row, oldest first", () => {
    const marks = breakMarks(breaks([2, 1]));

    expect(marks.get("m1")?.anchor).toBe(FIRST_BREAK_ANCHOR);
    expect(marks.get("m2")?.anchor).toBeUndefined();
  });

  it("says less when the row before it wasn't saved", () => {
    const withoutRowBefore: StatementBreaks = {
      ...breaks([2]),
      movements: [movement(2, -100_000, 800_000)],
    };

    expect(breakMarks(withoutRowBefore).get("m2")?.note).toBe(
      "Aquí el saldo no sigue al de la fila anterior.",
    );
  });

  it("marks nothing when no row breaks", () => {
    expect(breakMarks(breaks([])).size).toBe(0);
  });
});

describe("texts", () => {
  it.each([
    [-81_000, "El saldo final no cuadra por $810"],
    [81_000, "El saldo final no cuadra por $810"],
    [0, "El saldo no cuadra"],
    [null, "El saldo no cuadra"],
  ])("titles a difference of %s as %s", (difference, expected) => {
    expect(breaksTitle(difference === null ? null : amount(difference))).toBe(
      expected,
    );
  });

  it.each([
    [1, "1 fila no cuadra con la anterior: la marcamos abajo."],
    [2, "2 filas no cuadran con la anterior: las marcamos abajo."],
  ])("counts %i broken rows", (count, expected) => {
    expect(breaksSummary(count)).toBe(expected);
  });

  it("says when every row follows the one before", () => {
    expect(breaksSummary(0)).toMatch(/^Cada fila cuadra con la anterior/);
  });

  it("names the statement and warns that its movements don't count", () => {
    expect(statementName(QUARTER)).toBe("Extracto trimestral jul–sep 2026");
    expect(
      unreconciledText({
        id: "s1",
        accountId: "a1",
        period: QUARTER,
        differenceMinor: amount(-81_000),
      }),
    ).toBe(
      "Tu extracto trimestral jul–sep 2026 no cuadra por $810: sus movimientos no se cuentan aquí.",
    );
  });
});
