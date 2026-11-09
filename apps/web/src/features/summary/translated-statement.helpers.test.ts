import {
  amountMinorSchema,
  type CategorizationRuleId,
  type CategoryId,
  type LineNote,
  localDateSchema,
  type RecurringPayment,
  summarizeMovements,
} from "@xtrakto/core";
import type { AccountRow, PeriodMovement } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";
import type { AccountSummary } from "./summary.types";
import {
  noteText,
  translatedStatementView,
} from "./translated-statement.helpers";

const ACCOUNT: AccountRow = {
  id: "a1",
  bankId: "bancolombia",
  accountType: "savings",
  last4: "8821",
};
const QUARTER: MovementPeriod = { kind: "quarter", year: 2026, quarter: 3 };

type Row = readonly [
  id: string,
  date: string,
  amount: number,
  text: string,
  as: readonly [CategoryId | null, CategorizationRuleId | null, boolean?],
];

const movement = ([id, date, amount, text, [categoryId, rule, review]]: Row) =>
  ({
    id,
    date: localDateSchema.parse(date),
    amountMinor: amountMinorSchema.parse(amount),
    balanceAfterMinor: null,
    descriptionRaw: text,
    referenceHash: null,
    referenceLast4: null,
    categoryId,
    categoryRuleId: rule,
    isPendingReview: review ?? false,
    llmTitle: null,
  }) satisfies PeriodMovement;

// An invented quarter as `getSummary` reads it, with its fixed payments.
const summaryOf = (
  rows: readonly Row[],
  fixedPayments: readonly RecurringPayment[] = [],
): AccountSummary => {
  const movements = rows.map(movement);
  return {
    accounts: [ACCOUNT],
    account: ACCOUNT,
    quarters: [],
    years: [],
    period: QUARTER,
    movements,
    summary: summarizeMovements(movements),
    fixedPayments,
    balance: null,
    balances: null,
    bankFigures: [],
    unreconciled: [],
    missingMonths: [],
  };
};

const SALARY = "PAGO INTERBANC EMPRESA EJEMPLO";
const KEY = "PAGO LLAVE INVERSIONES XY";

const ROWS: readonly Row[] = [
  [
    "s1",
    "2026-07-05",
    3_154_020_000,
    SALARY,
    ["income_transfer", "interbank_in"],
  ],
  [
    "s2",
    "2026-07-30",
    830_000_000,
    SALARY,
    ["income_transfer", "interbank_in"],
  ],
  [
    "k1",
    "2026-08-10",
    -200_000_000,
    KEY,
    ["investment", "key_payment_saving", true],
  ],
  [
    "n1",
    "2026-08-12",
    120_000_000,
    "TRANSFERENCIA DESDE NEQUI",
    ["own_account_transfer", "nequi_in", true],
  ],
  [
    "c1",
    "2026-09-15",
    -125_000_000,
    "PAGO SUC VIRT TC MASTER PESOS",
    ["credit_card_payment", "card_payment"],
  ],
  ["z1", "2026-09-20", 18_000_00, "ABONO VARIOS", [null, null]],
  [
    "0",
    "2026-09-21",
    -9_000_00,
    "0",
    ["other_spending", "no_description_out", true],
  ],
];

describe("noteText", () => {
  it.each<[string, LineNote]>([
    [
      "Creemos que es tu inversión. Confírmalo en la revisión.",
      { kind: "guess", categoryId: "investment" },
    ],
    [
      "Creemos que es salud. Confírmalo en la revisión.",
      { kind: "guess", categoryId: "health" },
    ],
    [
      "Se repite entre el 1 y el 4 de cada mes.",
      { kind: "fixed", days: { first: 1, last: 4 } },
    ],
    [
      "Se repite el día 5 de cada mes.",
      { kind: "fixed", days: { first: 5, last: 5 } },
    ],
    [
      "Ese gasto está en el extracto de la tarjeta. Aquí no lo contamos dos veces.",
      { kind: "moved", categoryId: "credit_card_payment", direction: "out" },
    ],
    [
      "No es gasto: pasó a tu inversión.",
      { kind: "moved", categoryId: "investment", direction: "out" },
    ],
    [
      "No es gasto: pasó a otra cuenta tuya.",
      { kind: "moved", categoryId: "own_account_transfer", direction: "out" },
    ],
    [
      "No es ingreso: es tu propia plata que regresó.",
      { kind: "moved", categoryId: "investment", direction: "in" },
    ],
    [
      "Con el del 30 de julio suman $39,8M.",
      {
        kind: "sum",
        others: 1,
        totalMinor: amountMinorSchema.parse(3_984_020_000),
        otherDate: localDateSchema.parse("2026-07-30"),
      },
    ],
    [
      "Con otros 3 suman $90.000.",
      {
        kind: "sum",
        others: 3,
        totalMinor: amountMinorSchema.parse(-9_000_000),
      },
    ],
    ["Cuenta como gasto real.", { kind: "counts", categoryKind: "spending" }],
    ["Cuenta como ingreso.", { kind: "counts", categoryKind: "income" }],
    ["Aún no sabemos qué es: no cuenta en tus totales.", { kind: "counts" }],
  ])("says %j", (text, note) => {
    expect(noteText(note)).toBe(text);
  });
});

describe("translatedStatementView", () => {
  it("shows the period's lines in plain words over their bank text, with what each means and the way to its detail", () => {
    const view = translatedStatementView(summaryOf(ROWS));

    expect(view.lines.map(({ id }) => id)).toEqual([
      "s1",
      "k1",
      "c1",
      "n1",
      "z1",
    ]);
    expect(view.lines[0]).toEqual({
      id: "s1",
      categoryId: "income_transfer",
      tone: "income",
      title: "Te llegó plata de otro banco",
      isBankText: false,
      bankText: SALARY,
      note: "Con el del 30 de julio suman $39,8M.",
      channel: "Transferencia",
      isPendingReview: false,
      amount: "+$31.540.200",
      href: {
        pathname: "/transactions",
        query: { period: "2026-q3", movement: "s1" },
      },
    });
    // A guess, neutral; and money in nothing names, by its bank text.
    expect(view.lines[1]).toMatchObject({
      tone: "neutral",
      isPendingReview: true,
    });
    expect(view.lines[4]).toMatchObject({
      title: "ABONO VARIOS",
      isBankText: true,
      note: "Aún no sabemos qué es: no cuenta en tus totales.",
    });
    expect(view.lines[4]?.bankText).toBeUndefined();
    expect(view.seeAll).toEqual({
      label: "Ver los 7 movimientos",
      href: { pathname: "/transactions", query: { period: "2026-q3" } },
    });
  });

  it("links each filter in v8's order, counting what waits for review, and marks the current one", () => {
    const { filters } = translatedStatementView(summaryOf(ROWS), "moved");

    expect(filters.map(({ label, isCurrent }) => [label, isCurrent])).toEqual([
      ["Todo", false],
      ["Gasto", false],
      ["Movido", true],
      ["Ingresos", false],
      ["Por revisar · 3", false],
    ]);
    expect(filters[0]?.href).toEqual({
      pathname: "/",
      query: { period: "2026-q3" },
    });
    expect(filters[4]?.href).toEqual({
      pathname: "/",
      query: { period: "2026-q3", lines: "review" },
    });
  });

  it("keeps a filter in the way to its movements and to each line's detail", () => {
    const view = translatedStatementView(summaryOf(ROWS), "spending");

    // The bank's `0`, a guess of real spending, says it gave no text.
    expect(view.lines).toEqual([
      expect.objectContaining({
        id: "0",
        title: "Sin descripción del banco",
        bankText: "0",
        href: {
          pathname: "/transactions",
          query: { period: "2026-q3", filter: "spending", movement: "0" },
        },
      }),
    ]);
    expect(view.seeAll).toEqual({
      label: "Ver el movimiento",
      href: {
        pathname: "/transactions",
        query: { period: "2026-q3", filter: "spending" },
      },
    });
  });

  it("shows no lines, and no way to them, for a filter without movements", () => {
    const view = translatedStatementView(
      summaryOf(ROWS.filter(([id]) => id === "s1")),
      "moved",
    );

    expect(view.lines).toEqual([]);
    expect(view.seeAll).toBeUndefined();
  });

  it("says a fixed payment's days", () => {
    const loan: RecurringPayment = {
      label: "Financiera Andes S",
      referenceLast4: null,
      bankTexts: ["PAGO PSE Financiera Andes S"],
      categoryId: "loan_payment",
      channels: ["pse"],
      months: [],
      typicalAmountMinor: amountMinorSchema.parse(-154_000_000),
      days: { first: 1, last: 4 },
      lastDate: localDateSchema.parse("2026-09-02"),
      trend: { kind: "stable" },
    };
    const view = translatedStatementView(
      summaryOf(
        [
          [
            "l1",
            "2026-09-02",
            -154_000_000,
            "PAGO PSE Financiera Andes S",
            ["loan_payment", "pse_loan"],
          ],
        ],
        [loan],
      ),
    );

    expect(view.lines[0]?.note).toBe(
      "Se repite entre el 1 y el 4 de cada mes.",
    );
  });
});
