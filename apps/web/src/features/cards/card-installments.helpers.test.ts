import {
  amountMinorSchema,
  localDateSchema,
  periodSchema,
  preparedCardSchema,
} from "@xtrakto/core";
import type { CardFigures, CardPurchase } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import {
  installmentNote,
  installmentsLeft,
  lastMonthOf,
  latestInstallments,
  leftText,
} from "./card-installments.helpers";

const SHOES = "a".repeat(64);
const PHONE = "b".repeat(64);
const COFFEE = "c".repeat(64);

type Charged = {
  fingerprint: string;
  number: number;
  count: number;
  monthlyMinor?: number;
  remainingMinor?: number;
};

// A Nu statement of the period, charging these installments.
const statement = (
  from: string,
  to: string,
  installments: Charged[],
): CardFigures => ({
  period: periodSchema.parse({ from, to }),
  isVerified: true,
  differenceMinor: amountMinorSchema.parse(0),
  card: preparedCardSchema.parse({
    creditLimitMinor: 500_000_000,
    availableMinor: 400_000_000,
    minimumPaymentMinor: 0,
    totalPaymentMinor: 0,
    summary: {
      kind: "nu",
      dueThisMonthMinor: 0,
      interestMinor: 0,
      advanceFeesMinor: 0,
      serviceFeesMinor: 0,
      conversionChargesMinor: 0,
      paymentsToMinimumMinor: 0,
      refundsMinor: 0,
      paymentsToTotalMinor: 0,
      remainingDebtMinor: 0,
    },
    installments,
  }),
});

const purchase = (fingerprint: string, id: string): CardPurchase => ({
  id,
  date: localDateSchema.parse("2026-08-20"),
  descriptionRaw: "Almacen Ropa",
  amountMinor: amountMinorSchema.parse(-100_000_000),
  balanceAfterMinor: null,
  categoryId: "other_spending",
  categoryRuleId: "unknown_merchant",
  isPendingReview: false,
  llmTitle: null,
  fingerprint,
});

// September charges the shoes' first of 12 and the phone's second of 6;
// October the shoes' second and the coffee's only one; November doesn't
// reconcile.
const SEPTEMBER = statement("2026-08-12", "2026-09-10", [
  { fingerprint: SHOES, number: 1, count: 12, monthlyMinor: 8_333_300 },
  { fingerprint: PHONE, number: 2, count: 6, remainingMinor: 40_000_000 },
]);
const OCTOBER = statement("2026-09-11", "2026-10-10", [
  {
    fingerprint: SHOES,
    number: 2,
    count: 12,
    monthlyMinor: 8_333_300,
    remainingMinor: 83_333_000,
  },
  { fingerprint: COFFEE, number: 1, count: 1, remainingMinor: 0 },
]);
const NOVEMBER: CardFigures = {
  ...statement("2026-10-11", "2026-11-10", [
    { fingerprint: SHOES, number: 3, count: 12 },
  ]),
  isVerified: false,
};

describe("latestInstallments", () => {
  it("keeps each purchase's latest installment of a statement that reconciles, with the day it closed", () => {
    const latest = latestInstallments([SEPTEMBER, OCTOBER, NOVEMBER]);

    expect(latest.get(SHOES)).toMatchObject({
      number: 2,
      count: 12,
      closedOn: "2026-10-10",
    });
    expect(latest.get(PHONE)).toMatchObject({
      number: 2,
      count: 6,
      closedOn: "2026-09-10",
    });
    expect(latest.size).toBe(3);
  });
});

describe("installmentsLeft", () => {
  const purchases = [purchase(SHOES, "m1"), purchase(COFFEE, "m2")];

  it("lists what the latest statement that reconciles still charges, without a purchase paid in one", () => {
    const left = installmentsLeft([SEPTEMBER, OCTOBER, NOVEMBER], purchases);

    expect(left?.closedOn).toBe("2026-10-10");
    expect(
      left?.purchases.map(({ purchase: { id }, installment }) => ({
        id,
        number: installment.number,
        closedOn: installment.closedOn,
      })),
    ).toEqual([{ id: "m1", number: 2, closedOn: "2026-10-10" }]);
  });

  it("says nothing until a statement reconciles", () => {
    expect(installmentsLeft([NOVEMBER], purchases)).toBeNull();
  });
});

describe("an installment in words", () => {
  const latest = latestInstallments([SEPTEMBER, OCTOBER]);
  const shoes = latest.get(SHOES);
  const phone = latest.get(PHONE);
  if (!shoes || !phone) throw new Error("Expected both installments.");

  it("says which one it is and what the month's is", () => {
    expect(installmentNote(shoes)).toBe("2 de 12 · $83.333 al mes");
    expect(installmentNote(phone)).toBe("2 de 6");
  });

  it("finds the month of its last installment, across a new year", () => {
    expect(lastMonthOf(shoes)).toEqual({ year: 2027, month: 8 });
    expect(lastMonthOf(phone)).toEqual({ year: 2027, month: 1 });
  });

  it("says what's left of it, or how many installments when the statement prints no amount", () => {
    expect(leftText(shoes)).toBe("$833.330, hasta ago 2027");
    expect(leftText({ ...shoes, remainingMinor: undefined })).toBe(
      "10 cuotas, hasta ago 2027",
    );
  });
});
