import { describe, expect, it } from "vitest";
import { parsedStatementSchema } from "@xtrakto/core";
import type { ParsedStatement } from "@xtrakto/core";
import { reconcileCard } from "./card-reconciliation.helpers";
import { RECONCILIATION_ISSUE } from "./reconciliation.constants";
import { reconcile } from "./reconciliation.helpers";

const {
  CARD_CHARGES,
  CARD_TOTAL,
  CARD_MINIMUM,
  CARD_INSTALLMENTS,
  CARD_MOVEMENTS,
} = RECONCILIATION_ISSUE;

const VERIFIED = {
  balanceVerified: true,
  issues: [],
  closingDifferenceMinor: 0,
};

// A movement as a parser gives it, in Xtrakto's signs.
const movement = (date: string, text: string, amountMinor: number) => ({
  date,
  descriptionRaw: text,
  descriptionNormalized: text,
  amountMinor,
  sourceRow: 1,
});

// An invented month of a Bancolombia card, in Xtrakto's signs: a purchase of
// $120.000 in 12 installments, interest of $45.000,30, the card's fee and a
// payment of $500.000, beside a balance transfer of an earlier statement. Its
// debt, $2.690.000,30, rounds up to a total of $2.690.001.
const bancolombiaStatement = {
  bankId: "bancolombia",
  formatId: "bancolombia-credit-card",
  accountType: "credit_card",
  accountLast4: "1234",
  currency: "COP",
  period: { from: "2026-08-31", to: "2026-09-30" },
  periodSource: "statement",
  card: {
    creditLimitMinor: 500_000_000,
    availableMinor: 230_999_900,
    minimumPaymentMinor: 18_000_100,
    totalPaymentMinor: 269_000_100,
    dueDate: "2026-10-15",
    summary: {
      kind: "bancolombia",
      total: {
        previousBalanceMinor: 300_000_000,
        purchasesMinor: 12_000_000,
        lateInterestMinor: 0,
        interestMinor: 4_500_030,
        advancesMinor: 0,
        otherChargesMinor: 2_500_000,
        chargesMinor: 319_000_030,
        paymentsMinor: 50_000_000,
        creditInFavorMinor: 0,
      },
      minimum: {
        installmentsMinor: 1_000_000,
        earlierInstallmentsMinor: 10_000_000,
        advanceInstallmentsMinor: 0,
        lateInterestMinor: 0,
        interestMinor: 4_500_030,
        otherChargesMinor: 2_500_000,
        overdueMinor: 0,
        inFavorMinor: 0,
      },
    },
  },
  transactions: [
    movement("2026-09-30", "INTERESES CORRIENTES", -4_500_030),
    movement("2026-09-30", "CUOTA DE MANEJO", -2_500_000),
    movement("2026-09-15", "ABONO SUCURSAL VIRTUAL", 50_000_000),
    {
      ...movement("2026-09-12", "TIENDA EJEMPLO", -12_000_000),
      installment: { number: 1, count: 12, remainingMinor: 11_000_000 },
    },
    {
      ...movement("2026-03-10", "COMPRA DE CARTERA Y/O D", -300_000_000),
      installment: { number: 6, count: 30, remainingMinor: 240_000_000 },
    },
  ],
  warnings: [],
};

// An invented month of a Nu card: a purchase in 24 installments, one of an
// earlier statement, one in a single installment and a payment.
const nuStatement = {
  ...bancolombiaStatement,
  bankId: "nu",
  formatId: "nu-credit-card-pdf",
  period: { from: "2026-08-12", to: "2026-09-10" },
  card: {
    creditLimitMinor: 500_000_000,
    availableMinor: 488_975_000,
    minimumPaymentMinor: 1_025_000,
    totalPaymentMinor: 11_025_000,
    cutDate: "2026-09-11",
    summary: {
      kind: "nu",
      dueThisMonthMinor: 8_000_000,
      interestMinor: 0,
      advanceFeesMinor: 0,
      serviceFeesMinor: 0,
      conversionChargesMinor: 25_000,
      paymentsToMinimumMinor: 7_000_000,
      refundsMinor: 0,
      paymentsToTotalMinor: 20_000_000,
      remainingDebtMinor: 30_000_000,
    },
  },
  transactions: [
    {
      ...movement("2026-09-01", "TIENDA EJEMPLO", -21_000_000),
      installment: { number: 1, count: 24, remainingMinor: 20_000_000 },
    },
    {
      ...movement("2026-07-20", "APP DE VIAJES", -12_000_000),
      installment: { number: 2, count: 12, remainingMinor: 10_000_000 },
    },
    {
      ...movement("2026-08-20", "APP DE TRANSPORTE", -1_500_000),
      installment: { number: 1, count: 1, remainingMinor: 0 },
    },
    movement("2026-08-30", "Gracias por tu pago", 27_000_000),
  ],
};

const parsed = (statement: unknown): ParsedStatement =>
  parsedStatementSchema.parse(statement);

// A card statement with its card's figures changed.
const withCard = <S extends { card: object }>(statement: S, card: object) =>
  parsed({ ...statement, card: { ...statement.card, ...card } });

const withTotal = (total: object) =>
  withCard(bancolombiaStatement, {
    summary: {
      ...bancolombiaStatement.card.summary,
      total: { ...bancolombiaStatement.card.summary.total, ...total },
    },
  });

const checked = (statement: ParsedStatement) => {
  if (statement.card === undefined) throw new Error("Not a card statement");
  return reconcileCard(statement, statement.card);
};

const codesOf = (statement: ParsedStatement) =>
  checked(statement).issues.map(({ code }) => code);

describe("reconcileCard, by Bancolombia's sums", () => {
  it("verifies a month whose sums hold, the total and the minimum rounded up", () => {
    expect(checked(parsed(bancolombiaStatement))).toEqual(VERIFIED);
  });

  it("takes what's in the person's favor off the debt and the minimum", () => {
    // A refund of $10.000 left in the person's favor.
    const { summary } = bancolombiaStatement.card;
    const statement = parsed({
      ...bancolombiaStatement,
      card: {
        ...bancolombiaStatement.card,
        minimumPaymentMinor: 17_000_100,
        totalPaymentMinor: 268_000_100,
        summary: {
          ...summary,
          total: { ...summary.total, creditInFavorMinor: 1_000_000 },
          minimum: { ...summary.minimum, inFavorMinor: 1_000_000 },
        },
      },
      transactions: [
        ...bancolombiaStatement.transactions,
        movement("2026-09-20", "DEVOLUCION TIENDA EJEMPLO", 1_000_000),
      ],
    });

    expect(checked(statement)).toEqual(VERIFIED);
  });

  it("finds charges that don't add up to those printed", () => {
    expect(codesOf(withTotal({ purchasesMinor: 11_000_000 }))).toEqual([
      CARD_CHARGES,
    ]);
  });

  it.each([
    ["off by a peso", 269_000_200],
    ["not rounded up", 269_000_030],
  ])("finds a total %s", (_, totalPaymentMinor) => {
    expect(
      codesOf(withCard(bancolombiaStatement, { totalPaymentMinor })),
    ).toEqual([CARD_TOTAL]);
  });

  it("finds a minimum rounded down", () => {
    expect(
      codesOf(
        withCard(bancolombiaStatement, { minimumPaymentMinor: 18_000_000 }),
      ),
    ).toEqual([CARD_MINIMUM]);
  });

  it("finds installments that leave another debt", () => {
    const [interest, fee, payment, purchase, transfer] =
      bancolombiaStatement.transactions;
    const statement = parsed({
      ...bancolombiaStatement,
      transactions: [
        interest,
        fee,
        payment,
        purchase,
        {
          ...transfer,
          installment: { number: 6, count: 30, remainingMinor: 230_000_000 },
        },
      ],
    });

    expect(codesOf(statement)).toEqual([CARD_INSTALLMENTS]);
  });

  it("finds movements that don't take the previous balance to the debt, and by how much", () => {
    const [interest, fee, payment, ...rest] = bancolombiaStatement.transactions;
    const statement = parsed({
      ...bancolombiaStatement,
      transactions: [
        interest,
        fee,
        { ...payment, amountMinor: 49_000_000 },
        ...rest,
      ],
    });

    expect(checked(statement)).toEqual({
      balanceVerified: false,
      issues: [{ code: CARD_MOVEMENTS }],
      closingDifferenceMinor: 1_000_000,
    });
  });

  it("leaves a purchase of an earlier statement out of the period's movements", () => {
    const transfer = bancolombiaStatement.transactions.at(-1);
    const statement = parsed({
      ...bancolombiaStatement,
      transactions: [
        ...bancolombiaStatement.transactions.slice(0, -1),
        { ...transfer, date: "2026-09-01" },
      ],
    });

    expect(codesOf(statement)).toEqual([CARD_MOVEMENTS]);
  });
});

describe("reconcileCard, by Nu's sums", () => {
  it("verifies a month whose sums hold", () => {
    expect(checked(parsed(nuStatement))).toEqual(VERIFIED);
  });

  it("counts late interest within the month's due, not twice", () => {
    const summary = { ...nuStatement.card.summary, lateInterestMinor: 4_000 };

    expect(checked(withCard(nuStatement, { summary }))).toEqual(VERIFIED);
  });

  it("finds a minimum its summary doesn't give", () => {
    expect(
      codesOf(withCard(nuStatement, { minimumPaymentMinor: 1_000_000 })),
    ).toEqual([CARD_MINIMUM, CARD_TOTAL]);
  });

  it("finds a total its minimum and remaining debt don't give, and by how much", () => {
    expect(
      checked(withCard(nuStatement, { totalPaymentMinor: 11_125_000 })),
    ).toEqual({
      balanceVerified: false,
      issues: [{ code: CARD_TOTAL }],
      closingDifferenceMinor: 100_000,
    });
  });

  it("finds installments that don't leave the remaining debt", () => {
    const [first, ...rest] = nuStatement.transactions;
    const statement = parsed({
      ...nuStatement,
      transactions: [
        {
          ...first,
          installment: { number: 1, count: 24, remainingMinor: 19_000_000 },
        },
        ...rest,
      ],
    });

    expect(codesOf(statement)).toEqual([CARD_INSTALLMENTS]);
  });
});

describe("reconcile", () => {
  it("checks a card statement by its bank's sums", () => {
    const statement = parsed(bancolombiaStatement);

    expect(reconcile(statement)).toEqual(checked(statement));
  });
});
