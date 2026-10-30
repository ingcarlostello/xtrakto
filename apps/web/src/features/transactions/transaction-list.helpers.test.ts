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
  emptyListText,
  groupByDay,
  interestNote,
  interestTitle,
  movementList,
  movementSearchOf,
  movementTags,
  nextStep,
  shownText,
  totalText,
} from "./transaction-list.helpers";
import type { TransactionDay } from "./transaction.types";

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
  categoryRuleId: null,
  isPendingReview: false,
});

// A day's savings interest, as the table's rule categorized it.
const abono = (
  id: string,
  date: string,
  {
    amount = 14,
    balance = null,
  }: { amount?: number; balance?: number | null } = {},
): TransactionListItem => ({
  ...item(id, date, balance),
  descriptionRaw: "ABONO INTERESES AHORROS",
  amountMinor: amountMinorSchema.parse(amount),
  categoryId: "interest",
  categoryRuleId: "savings_interest",
});

// What each line is: a movement's id, or a month's interest in one line.
const linesOf = (days: readonly TransactionDay[]) =>
  days.map(({ date, lines }) => [
    date,
    lines.map((line) =>
      line.kind === "movement"
        ? line.item.id
        : `${line.count} abonos, ${line.amountMinor}`,
    ),
  ]);

describe("groupByDay", () => {
  it("keeps the list's order, one group per day", () => {
    const days = groupByDay([
      item("a", "2026-09-30"),
      item("b", "2026-09-30"),
      item("c", "2026-09-29"),
    ]);

    expect(linesOf(days)).toEqual([
      ["2026-09-30", ["a", "b"]],
      ["2026-09-29", ["c"]],
    ]);
  });

  it("keeps every daily interest row, as a statement printed it", () => {
    const days = groupByDay([
      abono("s30", "2026-09-30"),
      abono("s29", "2026-09-29"),
    ]);

    expect(linesOf(days)).toEqual([
      ["2026-09-30", ["s30"]],
      ["2026-09-29", ["s29"]],
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

describe("movementList", () => {
  // Newest first, a day's last movement first: September's two abonos,
  // August's two, and July's one, among purchases.
  const ITEMS = [
    abono("s30", "2026-09-30", { balance: 1_000_014 }),
    item("a", "2026-09-30", 1_000_000),
    abono("s29", "2026-09-29", { balance: 1_001_000 }),
    item("b", "2026-09-29", 1_000_986),
    item("c", "2026-09-28", 1_001_986),
    abono("a31", "2026-08-31", { amount: 13 }),
    abono("a30", "2026-08-30", { amount: 13 }),
    abono("j31", "2026-07-31", { amount: 12 }),
  ];

  it("puts a month's daily interest in one line, where its newest abono goes", () => {
    expect(linesOf(movementList(ITEMS, 30).days)).toEqual([
      ["2026-09-30", ["2 abonos, 28", "a"]],
      ["2026-09-29", ["b"]],
      ["2026-09-28", ["c"]],
      ["2026-08-31", ["2 abonos, 26"]],
      // A month with one abono shows it as it is.
      ["2026-07-31", ["j31"]],
    ]);
  });

  it("closes each day with its balance among all its movements, the grouped abonos too", () => {
    const [last, before] = movementList(ITEMS, 30).days;

    expect(last?.balanceMinor).toBe(1_000_014);
    expect(before?.balanceMinor).toBe(1_001_000);
  });

  it("shows as many lines as asked, and counts the movements they hold", () => {
    const { days, ...counts } = movementList(ITEMS, 2);

    expect(linesOf(days)).toEqual([["2026-09-30", ["2 abonos, 28", "a"]]]);
    expect(counts).toEqual({
      shownLines: 2,
      shownMovements: 3,
      lineCount: 6,
      groupedInterest: 4,
    });
  });

  it("groups only the daily interest the table's rule still calls interest", () => {
    const investment = {
      ...abono("i1", "2026-09-30"),
      descriptionRaw: "INTERES INV VIRT *******7525",
      categoryRuleId: "investment_interest",
    } as const;
    const corrected = {
      ...abono("s29", "2026-09-29"),
      categoryId: "other_income",
    } as const;

    expect(
      linesOf(
        movementList([investment, abono("s30", "2026-09-30"), corrected], 30)
          .days,
      ),
    ).toEqual([
      ["2026-09-30", ["i1", "s30"]],
      ["2026-09-29", ["s29"]],
    ]);
  });

  it("titles a month's line and says how many abonos it holds", () => {
    expect(interestTitle(localDateSchema.parse("2026-09-30"))).toBe(
      "Intereses de septiembre",
    );
    expect(interestNote(30)).toBe("30 abonos diarios, agrupados en una línea.");
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
  // A movement no rule or category names, unless a test says so.
  const movement = (
    descriptionRaw: string,
    changes: Partial<
      Pick<TransactionListItem, "categoryId" | "categoryRuleId">
    > = {},
  ) => ({ descriptionRaw, categoryId: null, categoryRuleId: null, ...changes });

  it("titles a movement in plain words over the bank's text as printed", () => {
    expect(
      descriptionView(
        movement("COMPRA EN  MERCADO XYZ", {
          categoryId: "groceries",
          categoryRuleId: "merchant_groceries",
        }),
      ),
    ).toEqual({
      kind: "titled",
      title: "Compra en supermercado",
      raw: "COMPRA EN  MERCADO XYZ",
    });
  });

  it("keeps the bank's text as printed when nothing names the movement", () => {
    expect(descriptionView(movement("ABONO  EJEMPLO"))).toEqual({
      kind: "bank",
      text: "ABONO  EJEMPLO",
    });
  });

  it.each(["0", " 0 "])(
    "reads the bank's %j as no description, whatever its category",
    (raw) => {
      expect(
        descriptionView(movement(raw, { categoryId: "groceries" })),
      ).toEqual({ kind: "none", raw });
    },
  );

  it("keeps a text that only starts with a zero", () => {
    expect(descriptionView(movement("0 COMISION"))).toEqual({
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
    expect(totalText(total, { search: "nequi" })).toBe(expected);
  });

  it.each([
    [1, "1 movimiento de «Efectivo»."],
    [31, "31 movimientos de «Efectivo»."],
  ])("counts %i movements of a category as %s", (total, expected) => {
    expect(totalText(total, { category: "cash_withdrawal" })).toBe(expected);
  });

  it("counts the matches of a search among a category's", () => {
    expect(
      totalText(2, { search: "cajero", category: "cash_withdrawal" }),
    ).toBe("2 movimientos coinciden con “cajero”.");
  });

  it("says how many daily abonos show grouped by month", () => {
    expect(totalText(312, { groupedInterest: 90 })).toBe(
      "312 movimientos del banco. Los 90 abonos diarios de intereses se ven agrupados por mes.",
    );
    expect(totalText(30, { search: "abono", groupedInterest: 30 })).toBe(
      "30 movimientos coinciden con “abono”. Los 30 abonos diarios de intereses se ven agrupados por mes.",
    );
  });

  it("says how many show", () => {
    expect(shownText(30, 1_234)).toBe("Mostrando 30 de 1.234");
  });
});

describe("emptyListText", () => {
  const AUGUST = { kind: "month", year: 2026, month: 8 } as const;

  it.each([
    [{}, "No hay movimientos en este periodo."],
    [{ filter: "income" }, "No hay movimientos de este tipo en el periodo."],
    [
      { category: "restaurants" },
      "No hay movimientos de esta categoría en el periodo.",
    ],
  ] as const)("says why a list with %o shows nothing", (shown, expected) => {
    expect(emptyListText({ period: AUGUST, ...shown })).toBe(expected);
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
