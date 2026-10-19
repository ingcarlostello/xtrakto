import {
  amountMinorSchema,
  type CategoryId,
  localDateSchema,
} from "@xtrakto/core";
import type { TransactionListItem } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import {
  amountText,
  dayBalanceText,
  dayHeading,
  descriptionView,
  detailLinks,
  groupByDay,
  movementSearchOf,
  movementTags,
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
  categoryId: null,
  isPendingReview: false,
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

  it.each([
    [1, "1 movimiento coincide con “nequi”."],
    [3, "3 movimientos coinciden con “nequi”."],
  ])("counts %i matches as %s", (total, expected) => {
    expect(totalText(total, "nequi")).toBe(expected);
  });

  it("says how many show", () => {
    expect(shownText(30, 1_234)).toBe("Mostrando 30 de 1.234");
  });
});

describe("movementSearchOf", () => {
  it("looks for an amount too when the text reads as one", () => {
    expect(movementSearchOf("$90.000")).toEqual({
      text: "$90.000",
      amountMinor: 9_000_000,
    });
  });

  it("looks only for the text otherwise", () => {
    expect(movementSearchOf("4x1000")).toEqual({ text: "4x1000" });
  });
});

describe("nextStep", () => {
  const AUGUST = { kind: "month", year: 2026, month: 8 } as const;
  const link = { accountId: "a1", period: AUGUST };

  it.each([
    { shown: 30, total: 312, count: 60, label: "Mostrar 30 más" },
    { shown: 300, total: 312, count: 312, label: "Mostrar 12 más" },
    { shown: 1_990, total: 5_000, count: 2_000, label: "Mostrar 10 más" },
  ])(
    "after $shown of $total shows $count",
    ({ shown, total, count, label }) => {
      expect(nextStep(shown, total, link)).toEqual({
        label,
        href: {
          pathname: "/transactions",
          query: { account: "a1", period: "2026-08", show: count },
        },
      });
    },
  );

  it.each([
    [312, 312],
    [7, 7],
    [2_000, 5_000],
  ])("brings nothing after %i of %i", (shown, total) => {
    expect(nextStep(shown, total, link)).toBeUndefined();
  });
});

describe("detailLinks", () => {
  const AUGUST = { kind: "month", year: 2026, month: 8 } as const;
  const link = { accountId: "a1", period: AUGUST, filter: "review" } as const;

  it("opens and closes a movement's detail keeping the list as it is", () => {
    const links = detailLinks(link, { shown: 60, openId: "m1" });

    expect(links.open("m2")).toEqual({
      pathname: "/transactions",
      query: {
        account: "a1",
        period: "2026-08",
        filter: "review",
        show: 60,
        movement: "m2",
      },
    });
    expect(links.close).toEqual({
      pathname: "/transactions",
      query: { account: "a1", period: "2026-08", filter: "review", show: 60 },
    });
    expect(links.openId).toBe("m1");
  });

  it("leaves out how many show while the list shows its first 30", () => {
    expect(detailLinks(link, { shown: 12 }).close.query).not.toHaveProperty(
      "show",
    );
  });
});

describe("movementTags", () => {
  const tagged = (
    descriptionRaw: string,
    categoryId: CategoryId | null,
    isPendingReview = false,
  ): TransactionListItem => ({
    ...item("m1", "2026-09-30"),
    descriptionRaw,
    categoryId,
    isPendingReview,
  });

  it.each([
    [
      "its channel and its category",
      tagged("TRANSFERENCIAS A NEQUI", "transfers_to_people"),
      {
        channel: "Nequi",
        category: "Pagos a personas",
        isPendingReview: false,
      },
    ],
    [
      "«Por revisar» instead of a guessed category",
      tagged("PAGO LLAVE Maria Lopez", "transfers_to_people", true),
      { channel: "Llave Bre-B", category: undefined, isPendingReview: true },
    ],
    [
      "its channel alone when no rule knows it",
      tagged("COMPRA EN  TIENDA LA ESQUI", null),
      { channel: "Débito", category: undefined, isPendingReview: false },
    ],
    [
      "its category alone when its text names no channel",
      tagged("ABONO INTERESES AHORROS", "interest"),
      { channel: undefined, category: "Intereses", isPendingReview: false },
    ],
    [
      "«Por revisar» alone for the bank's 0",
      tagged("0", "other_spending", true),
      { channel: undefined, category: undefined, isPendingReview: true },
    ],
  ])("shows %s", (_, movement, tags) => {
    expect(movementTags(movement, true)).toEqual(tags);
  });

  it("shows only the channel of a movement that counts nowhere", () => {
    const movement = tagged(
      "PAGO LLAVE Maria Lopez",
      "transfers_to_people",
      true,
    );

    expect(movementTags(movement, false)).toEqual({
      channel: "Llave Bre-B",
      category: undefined,
      isPendingReview: false,
    });
  });

  it("shows no category whose id the table no longer has", () => {
    // As a row saved before a category left categories.json could hold.
    const retired = "digital_wallet" as CategoryId;

    expect(
      movementTags(tagged("TRANSFERENCIAS A NEQUI", retired), true).category,
    ).toBeUndefined();
  });
});
