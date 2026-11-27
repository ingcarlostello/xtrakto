import { describe, expect, it } from "vitest";
import {
  annualRateOf,
  purchaseRateOf,
  usuryStanding,
} from "./card-rates.helpers";
import { preparedCardSchema } from "./card.schemas";

// Invented rates, against a usury rate of 28,34% a year, which is 2.1010% a
// month.
const USURY = 283_400;

const card = (overrides: object) =>
  preparedCardSchema.parse({
    creditLimitMinor: 500_000_000,
    availableMinor: 230_000_000,
    minimumPaymentMinor: 18_000_000,
    totalPaymentMinor: 269_000_000,
    installments: [],
    summary: {
      kind: "nu",
      dueThisMonthMinor: 8_000_000,
      interestMinor: 0,
      advanceFeesMinor: 0,
      serviceFeesMinor: 0,
      conversionChargesMinor: 0,
      paymentsToMinimumMinor: 0,
      refundsMinor: 0,
      paymentsToTotalMinor: 0,
      remainingDebtMinor: 30_000_000,
    },
    ...overrides,
  });

const installment = (monthlyRatePpm?: number) => ({
  fingerprint: "a".repeat(64),
  number: 2,
  count: 12,
  ...(monthlyRatePpm === undefined ? {} : { monthlyRatePpm }),
});

const bancolombia = {
  kind: "bancolombia",
  total: {
    previousBalanceMinor: 0,
    purchasesMinor: 0,
    lateInterestMinor: 0,
    interestMinor: 0,
    advancesMinor: 0,
    otherChargesMinor: 0,
    chargesMinor: 0,
    paymentsMinor: 0,
    creditInFavorMinor: 0,
  },
  minimum: {
    installmentsMinor: 0,
    earlierInstallmentsMinor: 0,
    advanceInstallmentsMinor: 0,
    lateInterestMinor: 0,
    interestMinor: 0,
    otherChargesMinor: 0,
    overdueMinor: 0,
    inFavorMinor: 0,
  },
};

describe("annualRateOf", () => {
  it.each([
    [19_000, 253_401],
    [20_500, 275_722],
    [0, 0],
  ])("makes %i a month an effective %i a year", (monthly, annual) => {
    expect(annualRateOf(monthly)).toBe(annual);
  });
});

describe("usuryStanding", () => {
  it.each([
    // Nu's two decimals: 2.10% may be 2.1050%, past the usury's 2.1010%.
    ["nu", 20_500, "below"],
    ["nu", 21_000, "at"],
    ["nu", 21_100, "above"],
    // Bancolombia's four: within a ten-thousandth of a percent.
    ["bancolombia", 21_000, "below"],
    ["bancolombia", 21_010, "at"],
    // 28,3413% a year still reads 28,34%.
    ["bancolombia", 21_011, "at"],
    // 28,35% a year.
    ["bancolombia", 21_015, "above"],
    ["nu", 0, "below"],
  ] as const)(
    "puts %s's %i a month %s 28,34% a year",
    (bank, monthlyRatePpm, standing) => {
      expect(usuryStanding({ monthlyRatePpm, bank }, USURY)).toBe(standing);
    },
  );
});

describe("purchaseRateOf", () => {
  it("takes the purchase rate Bancolombia prints, never an installment's", () => {
    expect(
      purchaseRateOf(
        card({
          summary: bancolombia,
          purchaseRatePpm: 19_000,
          installments: [installment(12_000)],
        }),
      ),
    ).toEqual({ monthlyRatePpm: 19_000, bank: "bancolombia" });
    expect(
      purchaseRateOf(
        card({ summary: bancolombia, installments: [installment(12_000)] }),
      ),
    ).toBeUndefined();
  });

  it("takes the highest rate Nu prints on its purchases", () => {
    expect(
      purchaseRateOf(
        card({
          installments: [
            installment(18_000),
            installment(20_500),
            installment(),
          ],
        }),
      ),
    ).toEqual({ monthlyRatePpm: 20_500, bank: "nu" });
    expect(purchaseRateOf(card({ installments: [installment()] }))).toBe(
      undefined,
    );
  });
});
