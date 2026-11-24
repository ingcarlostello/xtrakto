import { describe, expect, it } from "vitest";
import { parsedStatementSchema } from "../statements/statement.schemas";
import { installmentSchema } from "./card.schemas";

// Invented values only: no real cards, amounts or rates.
const bancolombiaSummary = {
  kind: "bancolombia",
  total: {
    previousBalanceMinor: 300_000_000,
    purchasesMinor: 12_000_000,
    lateInterestMinor: 0,
    interestMinor: 4_500_000,
    advancesMinor: 0,
    otherChargesMinor: 2_500_000,
    chargesMinor: 319_000_000,
    paymentsMinor: 50_000_000,
    creditInFavorMinor: 0,
  },
  minimum: {
    installmentsMinor: 1_000_000,
    earlierInstallmentsMinor: 10_000_000,
    advanceInstallmentsMinor: 0,
    lateInterestMinor: 0,
    interestMinor: 4_500_000,
    otherChargesMinor: 2_500_000,
    overdueMinor: 0,
    inFavorMinor: 0,
  },
};

const nuSummary = {
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
};

const card = (summary: object) => ({
  creditLimitMinor: 500_000_000,
  availableMinor: 230_000_000,
  minimumPaymentMinor: 18_000_000,
  totalPaymentMinor: 269_000_000,
  dueDate: "2026-10-15",
  summary,
});

const purchase = {
  date: "2026-09-12",
  descriptionRaw: "TIENDA EJEMPLO",
  descriptionNormalized: "TIENDA EJEMPLO",
  amountMinor: -12_000_000,
  installment: {
    number: 1,
    count: 12,
    monthlyMinor: 1_000_000,
    monthlyRatePpm: 19_000,
    remainingMinor: 11_000_000,
  },
  sourceRow: 31,
};

const cardStatement = (summary: object = bancolombiaSummary) => ({
  bankId: "bancolombia",
  formatId: "bancolombia-credit-card",
  accountType: "credit_card",
  accountLast4: "1234",
  currency: "COP",
  period: { from: "2026-08-31", to: "2026-09-30" },
  periodSource: "statement",
  card: card(summary),
  transactions: [purchase],
  warnings: [],
});

const isValid = (statement: unknown) =>
  parsedStatementSchema.safeParse(statement).success;

describe("a card statement", () => {
  it.each([
    ["Bancolombia's", bancolombiaSummary],
    ["Nu's", nuSummary],
    ["Nu's with late interest", { ...nuSummary, lateInterestMinor: 4_000 }],
  ])(
    "accepts %s summary, with its limit, what's due and by when",
    (_, summary) => {
      expect(isValid(cardStatement(summary))).toBe(true);
    },
  );

  it("accepts nothing due, and a cut apart from the period's last day", () => {
    const figures = {
      ...card(nuSummary),
      dueDate: undefined,
      cutDate: "2026-09-11",
    };

    expect(isValid({ ...cardStatement(nuSummary), card: figures })).toBe(true);
  });

  it("refuses a credit card's statement without its figures, and a savings one with them", () => {
    expect(isValid({ ...cardStatement(), card: undefined })).toBe(false);
    expect(isValid({ ...cardStatement(), accountType: "savings" })).toBe(false);
  });

  it.each([
    ["another bank's kind", { ...nuSummary, kind: "otro" }],
    ["a line it doesn't print", { ...nuSummary, previousBalanceMinor: 0 }],
    ["a line left out", { ...nuSummary, interestMinor: undefined }],
    ["an amount with cents' fractions", { ...nuSummary, refundsMinor: 0.5 }],
  ])("refuses a summary with %s", (_, summary) => {
    expect(isValid(cardStatement(summary))).toBe(false);
  });

  it("refuses a figure it doesn't hold, such as an address", () => {
    expect(
      isValid({
        ...cardStatement(),
        card: { ...card(bancolombiaSummary), address: "Calle 1 # 2-3" },
      }),
    ).toBe(false);
  });
});

describe("installmentSchema", () => {
  it("accepts an installment within its count, with or without its figures", () => {
    expect(installmentSchema.safeParse(purchase.installment).success).toBe(
      true,
    );
    expect(installmentSchema.safeParse({ number: 24, count: 24 }).success).toBe(
      true,
    );
  });

  it.each([
    ["past its count", { number: 13, count: 12 }],
    ["the 0th", { number: 0, count: 12 }],
    ["of more than banks offer", { number: 1, count: 121 }],
    ["a fraction", { number: 1.5, count: 12 }],
    ["a negative rate", { number: 1, count: 12, monthlyRatePpm: -1 }],
    ["another field", { number: 1, count: 12, merchant: "TIENDA" }],
  ])("refuses an installment %s", (_, installment) => {
    expect(installmentSchema.safeParse(installment).success).toBe(false);
  });
});
