import {
  amountMinorSchema,
  type CategorizationRuleId,
  type CategoryId,
  localDateSchema,
  type RecurringPayment,
  summarizeMovements,
} from "@xtrakto/core";
import type { AccountRow, PeriodMovement } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";
import type { AccountSummary } from "./summary.types";
import { spendingTiles } from "./where-it-went.helpers";

const ACCOUNT: AccountRow = {
  id: "a1",
  bankId: "bancolombia",
  accountType: "savings",
  last4: "8821",
};
const QUARTER: MovementPeriod = { kind: "quarter", year: 2026, quarter: 3 };
const AUGUST: MovementPeriod = { kind: "month", year: 2026, month: 8 };

type Row = readonly [
  date: string,
  amount: number,
  text: string,
  as: readonly [CategoryId, CategorizationRuleId],
];

const movement = ([date, amount, text, [categoryId, rule]]: Row) =>
  ({
    date: localDateSchema.parse(date),
    amountMinor: amountMinorSchema.parse(amount),
    balanceAfterMinor: null,
    descriptionRaw: text,
    referenceHash: null,
    referenceLast4: null,
    categoryId,
    categoryRuleId: rule,
  }) satisfies PeriodMovement;

// A period's summary as `getSummary` reads it, with its fixed payments.
const summaryOf = (
  rows: readonly Row[],
  {
    period = QUARTER,
    fixedPayments = [],
  }: {
    period?: MovementPeriod;
    fixedPayments?: readonly RecurringPayment[];
  } = {},
): AccountSummary => {
  const movements = rows.map(movement);
  return {
    accounts: [ACCOUNT],
    account: ACCOUNT,
    quarters: [],
    period,
    movements,
    summary: summarizeMovements(movements),
    fixedPayments,
    balance: null,
    balances: null,
    bankFigures: [],
    unreconciled: [],
  };
};

const LOAN = ["loan_payment", "pse_loan"] as const;
const CASH = ["cash_withdrawal", "cash_withdrawal"] as const;
const NEQUI = ["transfers_to_people", "nequi_out"] as const;
const QR = ["transfers_to_people", "qr_transfer_out"] as const;
const TRANSFER = ["transfers_to_people", "transfer_out"] as const;
const GROCERIES = ["groceries", "merchant_groceries"] as const;
const GMF = ["taxes_and_fees", "gmf_tax"] as const;
const FEE = ["taxes_and_fees", "bank_fee"] as const;
const GATEWAY = ["payment_gateways", "payment_gateway"] as const;
const UTILITY = ["utilities", "utility_payment"] as const;
const NO_TEXT = ["other_spending", "no_description_out"] as const;

// The 4x1000 from the 10th to the 18th of July, nine times.
const GMF_ROWS: readonly Row[] = [10, 11, 12, 13, 14, 15, 16, 17, 18].map(
  (day) => [`2026-07-${day}`, -200_000, "IMPTO GOBIERNO 4X1000", GMF],
);

// v8-01's quarter, in short: a loan's installment each month, three
// withdrawals, five payments to people, a purchase, the 4x1000 and a fee;
// and a card payment, which went out but wasn't spending.
const ROWS: readonly Row[] = [
  [
    "2026-07-25",
    -500_000_000,
    "PAGO SUC VIRT TC MASTER PESOS",
    ["credit_card_payment", "card_payment"],
  ],
  ["2026-07-02", -154_000_000, "PAGO PSE Financiera Andes S", LOAN],
  ["2026-08-03", -154_000_000, "PAGO PSE Financiera Andes S", LOAN],
  ["2026-09-02", -154_000_000, "PAGO PSE Financiera Andes S", LOAN],
  ["2026-07-05", -100_000_000, "RETIRO CAJERO CENTRO", CASH],
  ["2026-08-09", -105_000_000, "RETIRO CAJERO CENTRO", CASH],
  ["2026-09-20", -115_000_000, "RETIRO CAJERO CENTRO", CASH],
  ["2026-07-03", -20_000_000, "TRANSFERENCIAS A NEQUI", NEQUI],
  ["2026-08-17", -30_000_000, "TRANSFERENCIAS A NEQUI", NEQUI],
  ["2026-09-28", -25_000_000, "TRANSFERENCIAS A NEQUI", NEQUI],
  ["2026-08-21", -40_000_000, "TRANSF QR ANA PRUEBA", QR],
  ["2026-09-11", -71_000_000, "TRANSF A PEDRO PEREZ", TRANSFER],
  ["2026-07-15", -41_000_000, "COMPRA EN MERCADO XYZ", GROCERIES],
  ...GMF_ROWS,
  ["2026-07-20", -176_000, "COMIS RETIRO CAJERO OTRO BANCO", FEE],
];

const paid = (month: number, amount: number) => ({
  month: { year: 2026, month },
  amountMinor: amountMinorSchema.parse(amount),
  payments: [amountMinorSchema.parse(amount)],
});

// A fixed payment, by default the loan's, paid from July to September.
const fixed = (changes: Partial<RecurringPayment> = {}): RecurringPayment => ({
  label: "Financiera Andes S",
  referenceLast4: null,
  bankTexts: ["PAGO PSE Financiera Andes S"],
  categoryId: "loan_payment",
  channels: ["pse"],
  months: [7, 8, 9].map((month) => paid(month, -154_000_000)),
  typicalAmountMinor: amountMinorSchema.parse(-154_000_000),
  days: { first: 2, last: 3 },
  lastDate: localDateSchema.parse("2026-09-02"),
  trend: { kind: "stable" },
  ...changes,
});

const notesOf = (summary: AccountSummary) =>
  spendingTiles(summary).map(({ note }) => note);

describe("spendingTiles", () => {
  it("shows the three categories that weigh most, then the bank's costs to check", () => {
    expect(
      spendingTiles(summaryOf(ROWS, { fixedPayments: [fixed()] })),
    ).toEqual([
      {
        categoryId: "loan_payment",
        title: "Créditos",
        amount: "$4,6M",
        note: "46% de tu gasto real. 1 cuota, entre el 2 y el 3 de cada mes.",
        needsAttention: false,
      },
      {
        categoryId: "cash_withdrawal",
        title: "Efectivo",
        amount: "$3,2M",
        note: "32% de tu gasto real. 3 retiros de efectivo. No sabemos en qué se usó.",
        needsAttention: false,
      },
      {
        categoryId: "transfers_to_people",
        title: "Pagos a personas",
        amount: "$1,9M",
        note: "18% de tu gasto real. 5 pagos por Nequi, QR y transferencia.",
        needsAttention: false,
      },
      {
        categoryId: "taxes_and_fees",
        title: "Costos del banco · revisar",
        amount: "$19.760",
        note: "Te cobraron 4x1000 del 10 al 18 de julio, en 9 cobros. Revisa si tu cuenta es exenta.",
        needsAttention: true,
      },
    ]);
  });

  it("shows the four that weigh most when the bank charged no 4x1000", () => {
    const tiles = spendingTiles(
      summaryOf(ROWS.filter((row) => !GMF_ROWS.includes(row))),
    );

    expect(tiles.map(({ title }) => title)).toEqual([
      "Créditos",
      "Efectivo",
      "Pagos a personas",
      "Mercado",
    ]);
    expect(tiles[3]?.note).toBe("4% de tu gasto real. 1 pago por débito.");
  });

  it("points out the bank's costs once when they weigh among the most", () => {
    const tiles = spendingTiles(
      summaryOf([
        ["2026-07-05", -50_000_000, "RETIRO CAJERO CENTRO", CASH],
        ...GMF_ROWS.slice(0, 2),
      ]),
    );

    expect(tiles.map(({ title }) => title)).toEqual([
      "Efectivo",
      "Costos del banco · revisar",
    ]);
  });

  it("asks to check the payments through a gateway, which don't say the store", () => {
    const [gateways, cash] = spendingTiles(
      summaryOf([
        ["2026-07-05", -30_000_000, "COMPRA EN BOLD*CAFE", GATEWAY],
        ["2026-07-06", -30_000_000, "COMPRA EN BOLD*CAFE", GATEWAY],
        ["2026-07-07", -20_000_000, "RETIRO CAJERO CENTRO", CASH],
      ]),
    );

    expect(gateways).toMatchObject({
      title: "Pasarelas de pago · revisar",
      note: "75% de tu gasto real. 2 pagos sin tienda identificada. Pasaron por pasarelas de pago y el banco no dice dónde compraste: elige su categoría en Movimientos.",
      needsAttention: true,
    });
    expect(cash).toMatchObject({
      note: "25% de tu gasto real. 1 retiro de efectivo. No sabemos en qué se usó.",
      needsAttention: false,
    });
  });

  it("tells a category's fixed payments paid in the period and their days", () => {
    const bills: readonly Row[] = [
      ["2026-07-05", -16_500_000, "PAGO PSE Electrificadora de S", UTILITY],
      ["2026-07-12", -3_100_000, "PAGO PSE GAS NATURAL CIUDAD", UTILITY],
    ];
    const energy = fixed({
      categoryId: "utilities",
      days: { first: 5, last: 5 },
    });
    const gas = fixed({
      categoryId: "utilities",
      days: { first: 12, last: 12 },
    });
    // Paid until May: it stopped before the quarter.
    const water = fixed({
      categoryId: "utilities",
      months: [3, 4, 5].map((month) => paid(month, -4_000_000)),
    });

    expect(
      notesOf(summaryOf(bills, { fixedPayments: [energy, gas, water] })),
    ).toEqual([
      "100% de tu gasto real. 2 pagos fijos, entre el 5 y el 12 de cada mes.",
    ]);
    expect(notesOf(summaryOf(bills, { fixedPayments: [energy] }))).toEqual([
      "100% de tu gasto real. 1 pago fijo, el día 5 de cada mes.",
    ]);
    expect(notesOf(summaryOf(bills, { fixedPayments: [water] }))).toEqual([
      "100% de tu gasto real. 2 pagos por PSE.",
    ]);
  });

  it("counts a fixed payment only in the months it was paid", () => {
    const august: readonly Row[] = [
      ["2026-08-03", -154_000_000, "PAGO PSE Financiera Andes S", LOAN],
    ];
    const untilJuly = fixed({
      months: [5, 6, 7].map((month) => paid(month, -154_000_000)),
    });

    expect(
      notesOf(summaryOf(august, { period: AUGUST, fixedPayments: [fixed()] })),
    ).toEqual([
      "100% de tu gasto real. 1 cuota, entre el 2 y el 3 de cada mes.",
    ]);
    expect(
      notesOf(
        summaryOf(august, { period: AUGUST, fixedPayments: [untilJuly] }),
      ),
    ).toEqual(["100% de tu gasto real. 1 pago por PSE."]);
  });

  it("says when a category is a sliver of the spending, and a payment without a channel", () => {
    expect(
      notesOf(
        summaryOf([
          ["2026-07-05", -100_000_000, "COMPRA EN MERCADO XYZ", GROCERIES],
          ["2026-07-06", -200_000, "0", NO_TEXT],
        ]),
      ),
    ).toEqual([
      "100% de tu gasto real. 1 pago por débito.",
      "Menos del 1% de tu gasto real. 1 pago.",
    ]);
  });

  it("shows nothing without real spending", () => {
    expect(
      spendingTiles(
        summaryOf([
          [
            "2026-07-05",
            320_000_000,
            "PAGO INTERBANC EMPRESA",
            ["income_transfer", "interbank_in"],
          ],
        ]),
      ),
    ).toEqual([]);
  });
});
