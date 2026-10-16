import { amountMinorSchema, localDateSchema } from "@xtrakto/core";
import type { TransactionListItem } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import {
  amountText,
  dayBalanceText,
  dayHeading,
  descriptionView,
  groupByDay,
  nextStep,
  shownText,
  totalText,
} from "./transaction-list.helpers";

const item = (
  id: string,
  date: string,
  balance: number | null = null,
): TransactionListItem => ({
  id,
  date: localDateSchema.parse(date),
  descriptionRaw: "COMPRA EN TIENDA",
  amountMinor: amountMinorSchema.parse(-1_000),
  balanceAfterMinor: balance === null ? null : amountMinorSchema.parse(balance),
});

describe("groupByDay", () => {
  it("keeps the list's order, one group per day", () => {
    const days = groupByDay([
      item("a", "2026-09-30"),
      item("b", "2026-09-30"),
      item("c", "2026-09-29"),
    ]);

    expect(
      days.map(({ date, items }) => [date, items.map(({ id }) => id)]),
    ).toEqual([
      ["2026-09-30", ["a", "b"]],
      ["2026-09-29", ["c"]],
    ]);
  });

  it("closes a day with the balance after its last movement, the first listed", () => {
    const [day] = groupByDay([
      item("last", "2026-09-30", 648_231_000),
      item("first", "2026-09-30", 657_189_000),
    ]);

    expect(day?.balanceMinor).toBe(648_231_000);
  });

  it("takes the first balance printed when a movement before it has none", () => {
    const [day] = groupByDay([
      item("export", "2026-09-30"),
      item("quarterly", "2026-09-30", 500_000),
    ]);

    expect(day?.balanceMinor).toBe(500_000);
  });

  it("gives no balance to a day of a file that prints none", () => {
    const [day] = groupByDay([
      item("a", "2026-08-15"),
      item("b", "2026-08-15"),
    ]);

    expect(day?.balanceMinor).toBeNull();
  });
});

describe("dayHeading", () => {
  it("leaves this year out", () => {
    expect(dayHeading(localDateSchema.parse("2026-09-30"), "2026")).toBe(
      "Miércoles 30 de septiembre",
    );
  });

  it("says the year of another one", () => {
    expect(dayHeading(localDateSchema.parse("2025-12-31"), "2026")).toBe(
      "Miércoles 31 de diciembre de 2025",
    );
  });
});

describe("descriptionView", () => {
  it("keeps the bank's text exactly as printed, double spaces included", () => {
    expect(descriptionView("COMPRA EN  MERCADO XYZ")).toEqual({
      kind: "bank",
      text: "COMPRA EN  MERCADO XYZ",
    });
  });

  it.each(["0", " 0 "])("reads the bank's %j as no description", (raw) => {
    expect(descriptionView(raw)).toEqual({ kind: "none", raw });
  });

  it("keeps a text that only starts with a zero", () => {
    expect(descriptionView("0 COMISION")).toEqual({
      kind: "bank",
      text: "0 COMISION",
    });
  });
});

describe("amounts and counts", () => {
  it.each([
    [42_000, "+$420"],
    [-9_000_000, "−$90.000"],
    [1_234, "+$12,34"],
  ])("writes %i as %s", (minor, expected) => {
    expect(amountText(amountMinorSchema.parse(minor))).toBe(expected);
  });

  it("writes a day's balance", () => {
    expect(dayBalanceText(amountMinorSchema.parse(648_231_000))).toBe(
      "Saldo del día $6.482.310",
    );
  });

  it.each([
    [1, "1 movimiento del banco."],
    [1_234, "1.234 movimientos del banco."],
  ])("counts %i movements as %s", (total, expected) => {
    expect(totalText(total)).toBe(expected);
  });

  it("says how many show", () => {
    expect(shownText(30, 1_234)).toBe("Mostrando 30 de 1.234");
  });
});

describe("nextStep", () => {
  it.each([
    [30, 312, { count: 60, label: "Mostrar 30 más" }],
    [300, 312, { count: 312, label: "Mostrar 12 más" }],
    [1_990, 5_000, { count: 2_000, label: "Mostrar 10 más" }],
  ])("after %i of %i brings %o", (shown, total, expected) => {
    expect(nextStep(shown, total)).toEqual(expected);
  });

  it.each([
    [312, 312],
    [7, 7],
    [2_000, 5_000],
  ])("brings nothing after %i of %i", (shown, total) => {
    expect(nextStep(shown, total)).toBeUndefined();
  });
});
