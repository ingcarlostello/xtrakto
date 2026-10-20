import {
  amountMinorSchema,
  localDateSchema,
  type PeriodSummary,
  periodSchema,
} from "@xtrakto/core";
import type { AccountRow, BankFigures } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import { accountCardView } from "./account-card.helpers";
import type { AccountSummary } from "./summary.types";

const amount = (value: number) => amountMinorSchema.parse(value);
const period = (from: string, to: string) => periodSchema.parse({ from, to });
const NOTHING = { amountMinor: amount(0), count: 0 };

const ACCOUNT: AccountRow = {
  id: "a1",
  bankId: "bancolombia",
  accountType: "savings",
  last4: "8821",
};
// The figures don't read the summary.
const EMPTY_SUMMARY: PeriodSummary = {
  outflows: NOTHING,
  kinds: {
    income: NOTHING,
    spending: NOTHING,
    moved: { out: NOTHING, back: NOTHING },
  },
  spendingByCategory: [],
  incomeByCategory: [],
  movedByCategory: [],
  days: [],
  interest: NOTHING,
  gmfTax: NOTHING,
  cash: NOTHING,
  cardPayments: NOTHING,
};
// July to September, chained on to April to June, as v8-01 shows it.
const FIGURES: BankFigures = {
  period: period("2026-06-30", "2026-09-30"),
  averageBalanceMinor: amount(1_040_000_000),
  interestMinor: amount(132_000),
  movementCount: 312,
  chainedTo: period("2026-03-31", "2026-06-30"),
};

const summaryWith = (changes: Partial<AccountSummary>): AccountSummary => ({
  accounts: [ACCOUNT],
  account: ACCOUNT,
  quarters: [],
  period: { kind: "quarter", year: 2026, quarter: 3 },
  summary: EMPTY_SUMMARY,
  balance: {
    date: localDateSchema.parse("2026-09-30"),
    amountMinor: amount(648_231_000),
  },
  bankFigures: [FIGURES],
  unreconciled: [],
  ...changes,
});

describe("accountCardView", () => {
  it("reads a verified quarter chained on to the one before", () => {
    expect(accountCardView(summaryWith({}))).toEqual({
      balance: { label: "Saldo al 30 de septiembre", amount: "$6.482.310" },
      account: "Cuenta de ahorros · Bancolombia ••••8821",
      figures: [
        { label: "Saldo promedio", value: "$10,4M" },
        { label: "Intereses pagados", value: "$1.320" },
      ],
      status: {
        tone: "ok",
        title: "Saldo verificado",
        detail: "Encadenado con abr–jun 2026 · 312 cuadran",
      },
    });
  });

  it.each([
    { count: 312, detail: "312 movimientos cuadran" },
    { count: 1, detail: "1 movimiento cuadra" },
  ])(
    "counts the movements of a statement that chains on to none: $detail",
    ({ count, detail }) => {
      const unchained = { ...FIGURES, movementCount: count, chainedTo: null };

      expect(
        accountCardView(summaryWith({ bankFigures: [unchained] })).status
          .detail,
      ).toBe(detail);
    },
  );

  it("says a month's figures are its quarter's", () => {
    const view = accountCardView(
      summaryWith({ period: { kind: "month", year: 2026, month: 8 } }),
    );

    expect(view.figures.map(({ label }) => label)).toEqual([
      "Saldo promedio del trimestre",
      "Intereses del trimestre",
    ]);
  });

  it.each([
    { minor: 99_999_900, value: "$999.999" },
    { minor: 100_000_000, value: "$1,0M" },
    { minor: 513_425_900, value: "$5,1M" },
  ])(
    "writes a box under a million exact, and from one compact: $value",
    ({ minor, value }) => {
      const figures = { ...FIGURES, averageBalanceMinor: amount(minor) };

      expect(
        accountCardView(summaryWith({ bankFigures: [figures] })).figures[0]
          ?.value,
      ).toBe(value);
    },
  );

  it("leaves out a figure the statement didn't print", () => {
    expect(
      accountCardView(
        summaryWith({ bankFigures: [{ ...FIGURES, interestMinor: null }] }),
      ).figures,
    ).toEqual([{ label: "Saldo promedio", value: "$10,4M" }]);
  });

  it("says by how much a statement of the period doesn't reconcile, and where", () => {
    const broken = {
      id: "s1",
      accountId: "a1",
      period: period("2026-06-30", "2026-09-30"),
      differenceMinor: amount(-81_000),
    };

    const view = accountCardView(
      summaryWith({ bankFigures: [], unreconciled: [broken] }),
    );

    expect(view.status).toEqual({
      tone: "attention",
      title: "No cuadra por $810",
      detail: "Revisa el archivo",
    });
    expect(view.breaksHref).toBe("/transactions/breaks/s1");
    // Its chain breaks, though its closing balance adds up.
    for (const differenceMinor of [null, amount(0)])
      expect(
        accountCardView(
          summaryWith({ unreconciled: [{ ...broken, differenceMinor }] }),
        ).status.title,
      ).toBe("No cuadra");
  });

  it("reads files without balances", () => {
    expect(
      accountCardView(summaryWith({ balance: null, bankFigures: [] })),
    ).toEqual({
      account: "Cuenta de ahorros · Bancolombia ••••8821",
      figures: [],
      status: {
        tone: "none",
        title: "Sin saldo para verificar",
        detail: "Archivo de movimientos",
      },
    });
  });
});
