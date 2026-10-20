import { describe, expect, it } from "vitest";
import type { CategoryId } from "../categories/category.types";
import type { CategorizationRuleId } from "../categorization/categorization.types";
import { localDateSchema, periodSchema } from "../dates/date.schemas";
import { amountMinorSchema } from "../money/money.schemas";
import type {
  AmountTrend,
  RecurringPayment,
} from "../recurring/recurring.types";
import type { SummaryMovement } from "../summary/summary.types";
import {
  cashInsight,
  gatewaysInsight,
  gmfTaxInsight,
  newRecurringInsights,
  risenRecurringInsights,
  savingsYieldInsight,
} from "./insights.helpers";
import type { StatementFigures } from "./insights.types";

const amount = (value: number) => amountMinorSchema.parse(value);
const date = (value: string) => localDateSchema.parse(value);
const period = (from: string, to: string) => periodSchema.parse({ from, to });

// A movement that counts, as a period's summary reads it.
const movement = ({
  day,
  amountMinor,
  categoryId,
  ruleId = null,
}: {
  day: string;
  amountMinor: number;
  categoryId: CategoryId | null;
  ruleId?: CategorizationRuleId | null;
}): SummaryMovement => ({
  date: date(day),
  amountMinor: amount(amountMinor),
  categoryId,
  categoryRuleId: ruleId,
});

const GMF = { categoryId: "taxes_and_fees", ruleId: "gmf_tax" } as const;
const FEE = { categoryId: "taxes_and_fees", ruleId: "bank_fee" } as const;
const CASH = {
  categoryId: "cash_withdrawal",
  ruleId: "cash_withdrawal",
} as const;
const GATEWAY = {
  categoryId: "payment_gateways",
  ruleId: "payment_gateway",
} as const;

describe("gmfTaxInsight", () => {
  it("adds up the 4x1000 and the days it was charged, not the bank's other costs", () => {
    const movements = [
      movement({ day: "2026-07-18", amountMinor: -500_000, ...GMF }),
      movement({ day: "2026-07-12", amountMinor: -1_000_000, ...FEE }),
      movement({ day: "2026-07-10", amountMinor: -480_000, ...GMF }),
      movement({
        day: "2026-07-11",
        amountMinor: -9_000_000,
        categoryId: "groceries",
      }),
    ];

    expect(gmfTaxInsight(movements)).toEqual({
      kind: "gmf_tax",
      total: { amountMinor: -980_000, count: 2 },
      days: period("2026-07-10", "2026-07-18"),
    });
  });

  it("finds none when the 4x1000 wasn't charged", () => {
    expect(
      gmfTaxInsight([
        movement({ day: "2026-07-12", amountMinor: -1_000_000, ...FEE }),
      ]),
    ).toBeUndefined();
    expect(gmfTaxInsight([])).toBeUndefined();
  });
});

describe("money without detail", () => {
  const movements = [
    movement({ day: "2026-07-20", amountMinor: -30_000_000, ...CASH }),
    movement({ day: "2026-07-21", amountMinor: -10_000_000, ...GATEWAY }),
    movement({ day: "2026-08-02", amountMinor: -20_000_000, ...CASH }),
    // Money in through a gateway is the user's own sale.
    movement({ day: "2026-08-03", amountMinor: 5_000_000, ...GATEWAY }),
    movement({ day: "2026-08-04", amountMinor: -2_000_000, ...GATEWAY }),
  ];

  it("adds up the cash withdrawn", () => {
    expect(cashInsight(movements)).toEqual({
      kind: "cash",
      total: { amountMinor: -50_000_000, count: 2 },
    });
  });

  it("adds up the payments through gateways, not the money they brought in", () => {
    expect(gatewaysInsight(movements)).toEqual({
      kind: "payment_gateways",
      total: { amountMinor: -12_000_000, count: 2 },
    });
  });

  it("finds none without them", () => {
    const groceries = [
      movement({
        day: "2026-07-11",
        amountMinor: -9_000_000,
        categoryId: "groceries",
      }),
    ];

    expect(cashInsight(groceries)).toBeUndefined();
    expect(gatewaysInsight(groceries)).toBeUndefined();
  });
});

describe("savingsYieldInsight", () => {
  // A quarterly statement opens on the previous quarter's last day.
  const THIRD_QUARTER: StatementFigures = {
    period: period("2026-06-30", "2026-09-30"),
    averageBalanceMinor: amount(1_040_000_000),
    interestMinor: amount(132_000),
  };
  const SECOND_QUARTER: StatementFigures = {
    period: period("2026-03-31", "2026-06-30"),
    averageBalanceMinor: amount(900_000_000),
    interestMinor: amount(100_000),
  };

  it("finds the effective annual rate a quarter's interest makes on its average balance", () => {
    const insight = savingsYieldInsight([THIRD_QUARTER]);

    expect(insight).toMatchObject({
      kind: "savings_yield",
      interestMinor: 132_000,
      averageBalanceMinor: 1_040_000_000,
    });
    // $1.320 on $10,4M over 92 days, compounded daily for a year.
    expect(insight?.annualRatePercent).toBeCloseTo(0.05037, 5);
  });

  it("weighs two quarters by their days", () => {
    const insight = savingsYieldInsight([SECOND_QUARTER, THIRD_QUARTER]);

    expect(insight).toMatchObject({
      interestMinor: 232_000,
      averageBalanceMinor: 970_382_514,
    });
    expect(insight?.annualRatePercent).toBeCloseTo(0.0477, 5);
  });

  it("leaves out a statement that didn't print its figures", () => {
    const unprinted = { ...SECOND_QUARTER, interestMinor: null };

    expect(savingsYieldInsight([unprinted, THIRD_QUARTER])).toEqual(
      savingsYieldInsight([THIRD_QUARTER]),
    );
  });

  it.each([
    { label: "no statement", figures: [] },
    {
      label: "no interest",
      figures: [{ ...THIRD_QUARTER, interestMinor: amount(0) }],
    },
    {
      label: "no balance",
      figures: [{ ...THIRD_QUARTER, averageBalanceMinor: amount(0) }],
    },
    {
      label: "no average balance printed",
      figures: [{ ...THIRD_QUARTER, averageBalanceMinor: null }],
    },
  ])("finds none with $label", ({ figures }) => {
    expect(savingsYieldInsight(figures)).toBeUndefined();
  });
});

// A payment of `amountMinor` in each of its months of 2026.
const fixedPayment = ({
  label,
  months,
  trend = { kind: "stable" },
}: {
  label: string;
  months: readonly (readonly [month: number, amountMinor: number])[];
  trend?: AmountTrend;
}): RecurringPayment => ({
  label,
  referenceLast4: null,
  bankTexts: [`PAGO PSE ${label}`],
  categoryId: "utilities",
  channels: ["pse"],
  months: months.map(([month, value]) => ({
    month: { year: 2026, month },
    amountMinor: amount(value),
    payments: [amount(value)],
  })),
  typicalAmountMinor: amount(months[1]?.[1] ?? 0),
  days: { first: 10, last: 10 },
  lastDate: date(`2026-${String(months.at(-1)?.[0]).padStart(2, "0")}-10`),
  trend,
});

describe("newRecurringInsights", () => {
  const GYM = fixedPayment({
    label: "GIMNASIO FIT",
    months: [
      [7, -11_000_000],
      [8, -11_000_000],
      [9, -11_000_000],
    ],
  });
  const JUNE = [{ date: date("2026-06-15") }];

  it("finds a payment whose third month fell in the period, with movements before it", () => {
    expect(
      newRecurringInsights([GYM], {
        period: period("2026-07-01", "2026-09-30"),
        movements: JUNE,
      }),
    ).toEqual([
      { kind: "new_recurring", payment: GYM, since: { year: 2026, month: 7 } },
    ]);
  });

  it("finds it new in the month of its third payment, and not before", () => {
    const inMonth = (from: string, to: string) =>
      newRecurringInsights([GYM], {
        period: period(from, to),
        movements: JUNE,
      });

    expect(inMonth("2026-09-01", "2026-09-30")).toHaveLength(1);
    expect(inMonth("2026-08-01", "2026-08-31")).toEqual([]);
  });

  it("finds none for a payment that repeated before the period", () => {
    const older = fixedPayment({
      label: "HOGAR CONECTADO SA",
      months: [4, 5, 6, 7, 8, 9].map((month) => [month, -12_990_000] as const),
    });

    expect(
      newRecurringInsights([older], {
        period: period("2026-07-01", "2026-09-30"),
        movements: [{ date: date("2026-03-15") }],
      }),
    ).toEqual([]);
  });

  it("finds none without movements in the month before its first", () => {
    expect(
      newRecurringInsights([GYM], {
        period: period("2026-07-01", "2026-09-30"),
        movements: [{ date: date("2026-05-15") }, { date: date("2026-07-10") }],
      }),
    ).toEqual([]);
  });
});

describe("risenRecurringInsights", () => {
  const ENERGY = fixedPayment({
    label: "EMPRESA DE ENERGIA",
    months: [
      [7, -15_000_000],
      [8, -15_400_000],
      [9, -16_800_000],
    ],
    trend: { kind: "rose", percent: 12 },
  });
  const WATER = fixedPayment({
    label: "Acueducto Municipa",
    months: [
      [7, -9_000_000],
      [8, -9_200_000],
      [9, -10_800_000],
    ],
    trend: { kind: "rose", percent: 20 },
  });
  const PHONE = fixedPayment({
    label: "Telefonia Movil",
    months: [
      [7, -6_200_000],
      [8, -6_200_000],
      [9, -6_200_000],
    ],
  });

  it("finds the payments that rose, from their first month to their last, the most first", () => {
    expect(risenRecurringInsights([ENERGY, PHONE, WATER])).toEqual([
      {
        kind: "recurring_rose",
        payment: WATER,
        percent: 20,
        from: WATER.months[0],
        to: WATER.months[2],
        riseMinor: 1_800_000,
      },
      {
        kind: "recurring_rose",
        payment: ENERGY,
        percent: 12,
        from: ENERGY.months[0],
        to: ENERGY.months[2],
        riseMinor: 1_800_000,
      },
    ]);
  });

  it("puts the one that rose more money first when their percents tie", () => {
    const gas = fixedPayment({
      label: "GAS NATURAL CIUDAD",
      months: [
        [7, -2_800_000],
        [8, -2_900_000],
        [9, -3_136_000],
      ],
      trend: { kind: "rose", percent: 12 },
    });

    expect(
      risenRecurringInsights([gas, ENERGY]).map(({ payment }) => payment.label),
    ).toEqual(["EMPRESA DE ENERGIA", "GAS NATURAL CIUDAD"]);
  });

  it("finds none when none rose", () => {
    expect(risenRecurringInsights([PHONE])).toEqual([]);
  });
});
