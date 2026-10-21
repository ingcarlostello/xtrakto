import {
  amountMinorSchema,
  type CategorizationRuleId,
  type CategoryId,
  dailyBalances,
  localDateSchema,
  summarizeMovements,
} from "@xtrakto/core";
import type { AccountRow } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";
import { dayByDayChart } from "./day-by-day-chart.helpers";
import type { AccountSummary } from "./summary.types";

const ACCOUNT: AccountRow = {
  id: "a1",
  bankId: "bancolombia",
  accountType: "savings",
  last4: "8821",
};
const QUARTER: MovementPeriod = { kind: "quarter", year: 2026, quarter: 3 };
const AUGUST: MovementPeriod = { kind: "month", year: 2026, month: 8 };

type Row = {
  readonly date: string;
  readonly amount: number;
  readonly as: readonly [CategoryId, CategorizationRuleId];
  /** What the statement printed after it; `null` in a movements export. */
  readonly balance: number | null;
};

// A period's summary as `getSummary` reads it from its movements.
const summaryOf = (
  period: MovementPeriod,
  rows: readonly Row[],
): AccountSummary => {
  const movements = rows.map(({ date, amount, as, balance }) => ({
    date: localDateSchema.parse(date),
    amountMinor: amountMinorSchema.parse(amount),
    categoryId: as[0],
    categoryRuleId: as[1],
    balanceAfterMinor:
      balance === null ? null : amountMinorSchema.parse(balance),
  }));
  return {
    accounts: [ACCOUNT],
    account: ACCOUNT,
    quarters: [],
    period,
    summary: summarizeMovements(movements),
    balance: null,
    balances: dailyBalances(movements),
    bankFigures: [],
    unreconciled: [],
  };
};

const GROCERIES = ["groceries", "merchant_groceries"] as const;
const SALARY = ["income_transfer", "interbank_in"] as const;
const INVESTMENT = ["investment", "investment_opening"] as const;
const CASH = ["cash_withdrawal", "cash_withdrawal"] as const;
const INTEREST = ["interest", "savings_interest"] as const;

// v8-01's quarter, in short: $13,8M on June 30, a purchase in July, $31,5M
// in on August 4 with $22,0M of it to the investment that same day, and a
// withdrawal on September 30 that leaves $6,5M.
const ROWS: readonly Row[] = [
  {
    date: "2026-07-10",
    amount: -100_000_000,
    as: GROCERIES,
    balance: 1_280_000_000,
  },
  {
    date: "2026-08-04",
    amount: 3_154_020_000,
    as: SALARY,
    balance: 4_434_020_000,
  },
  {
    date: "2026-08-04",
    amount: -2_200_000_000,
    as: INVESTMENT,
    balance: 2_234_020_000,
  },
  {
    date: "2026-09-30",
    amount: -1_584_020_000,
    as: CASH,
    balance: 650_000_000,
  },
];

// A line's points, each as "x,y".
const pointsOf = (line = "") => line.split(" ");

describe("dayByDayChart", () => {
  const chart = dayByDayChart(summaryOf(QUARTER, ROWS));

  it("puts round amounts on the left, past the highest balance, and a quarter's months' last days under the plot", () => {
    expect(chart?.title).toBe("Tu saldo y tu gasto real, día a día");
    expect(chart?.yTicks).toEqual([
      { label: "$30M", at: 0 },
      { label: "$20M", at: 33.33 },
      { label: "$10M", at: 66.67 },
      { label: "$0", at: 100 },
    ]);
    expect(chart?.xTicks).toEqual([
      { label: "30 jun", at: 0 },
      { label: "31 jul", at: 33.7 },
      { label: "31 ago", at: 67.39 },
      { label: "30 sep", at: 100 },
    ]);
  });

  it("draws the balance each day from the opening, the same over days without movements, over its area", () => {
    const balance = pointsOf(chart?.balance?.line);

    expect(balance).toHaveLength(93);
    expect(balance[0]).toBe("0,54");
    expect(balance[9]).toBe("9.78,54");
    expect(balance[10]).toBe("10.87,57.33");
    expect(balance[35]).toBe("38.04,25.53");
    expect(balance[60]).toBe("65.22,25.53");
    expect(balance[92]).toBe("100,78.33");
    expect(chart?.balance?.area).toBe(`0,100 ${chart?.balance?.line} 100,100`);
    expect(chart?.note).toBeUndefined();
  });

  it("draws the real spending so far, from nothing at the opening", () => {
    const spending = pointsOf(chart?.spending);

    expect(spending).toHaveLength(93);
    expect(spending[0]).toBe("0,100");
    expect(spending[10]).toBe("10.87,96.67");
    expect(spending[91]).toBe("98.91,96.67");
    expect(spending[92]).toBe("100,43.87");
  });

  it("points out the day the most income came in, and where money moved that same day", () => {
    expect(chart?.event).toEqual({
      x: 38.04,
      y: 25.53,
      title: "4 de agosto: entraron $31,5M",
      detail: "Ese mismo día $22,0M pasaron a tu inversión. No fue gasto.",
    });
  });

  it("says how the balance went and how much was spent", () => {
    expect(chart?.label).toBe(
      "Tu saldo pasó de $13,8M el 30 de junio a $6,5M el 30 de septiembre, y tu gasto real llegó a $16,8M.",
    );
  });

  it("puts a month's 10th and 20th between its opening and its last day, and calls its largest income the month's", () => {
    const august = dayByDayChart(
      summaryOf(AUGUST, [
        {
          date: "2026-08-04",
          amount: 3_154_020_000,
          as: SALARY,
          balance: 4_534_020_000,
        },
        {
          date: "2026-08-20",
          amount: -100_000_000,
          as: GROCERIES,
          balance: 4_434_020_000,
        },
      ]),
    );

    expect(august?.xTicks).toEqual([
      { label: "31 jul", at: 0 },
      { label: "10 ago", at: 32.26 },
      { label: "20 ago", at: 64.52 },
      { label: "31 ago", at: 100 },
    ]);
    expect(august?.event?.detail).toBe("Fue el día con más ingresos del mes.");
    expect(pointsOf(august?.balance?.line)).toHaveLength(21);
  });

  it("splits a scale in round steps of $2,5M", () => {
    const small = dayByDayChart(
      summaryOf(QUARTER, [
        {
          date: "2026-07-10",
          amount: -100_000_000,
          as: GROCERIES,
          balance: 650_000_000,
        },
      ]),
    );

    expect(small?.yTicks.map(({ label }) => label)).toEqual([
      "$7,5M",
      "$5M",
      "$2,5M",
      "$0",
    ]);
  });

  it("keeps whole pesos on the smallest scale", () => {
    const tiny = dayByDayChart(
      summaryOf(QUARTER, [
        { date: "2026-07-10", amount: -700, as: GROCERIES, balance: null },
      ]),
    );

    expect(tiny?.yTicks.map(({ label }) => label)).toEqual(["$10", "$0"]);
  });

  it("goes under $0 when the balance does", () => {
    const below = dayByDayChart(
      summaryOf(QUARTER, [
        {
          date: "2026-07-10",
          amount: -150_000_000,
          as: CASH,
          balance: -50_000_000,
        },
      ]),
    );

    expect(below?.yTicks).toEqual([
      { label: "$2M", at: 0 },
      { label: "$1M", at: 33.33 },
      { label: "$0", at: 66.67 },
      { label: "−$1M", at: 100 },
    ]);
  });

  it("points out no day when what came in doesn't stand out on the scale", () => {
    const interest = dayByDayChart(
      summaryOf(QUARTER, [
        {
          date: "2026-07-01",
          amount: 28_900,
          as: INTEREST,
          balance: 1_380_028_900,
        },
        {
          date: "2026-07-10",
          amount: -100_000_000,
          as: GROCERIES,
          balance: 1_280_028_900,
        },
      ]),
    );

    expect(interest?.event).toBeUndefined();
  });

  it("points out the first of two days the same income came in", () => {
    const twice = dayByDayChart(
      summaryOf(QUARTER, [
        {
          date: "2026-07-10",
          amount: 300_000_000,
          as: SALARY,
          balance: 1_680_000_000,
        },
        {
          date: "2026-08-10",
          amount: 300_000_000,
          as: SALARY,
          balance: 1_980_000_000,
        },
      ]),
    );

    expect(twice?.event?.title).toBe("10 de julio: entraron $3,0M");
  });

  it("says when nothing was spent", () => {
    const saved = dayByDayChart(
      summaryOf(QUARTER, [
        {
          date: "2026-08-04",
          amount: 3_154_020_000,
          as: SALARY,
          balance: 4_534_020_000,
        },
      ]),
    );

    expect(saved?.label).toBe(
      "Tu saldo pasó de $13,8M el 30 de junio a $45,3M el 4 de agosto. No hubo gasto real en este periodo.",
    );
    expect(
      pointsOf(saved?.spending).every((point) => point.endsWith(",100")),
    ).toBe(true);
  });

  it("draws only the real spending, and points out no day, when the files print no balances", () => {
    const exported = dayByDayChart(
      summaryOf(
        QUARTER,
        ROWS.map((row) => ({ ...row, balance: null })),
      ),
    );

    expect(exported).toMatchObject({
      title: "Tu gasto real, día a día",
      note: "Tus archivos de movimientos no traen saldo.",
      label: "Tu gasto real llegó a $16,8M el 30 de septiembre.",
    });
    expect(exported?.balance).toBeUndefined();
    expect(exported?.event).toBeUndefined();
    expect(exported?.yTicks.map(({ label }) => label)).toEqual([
      "$20M",
      "$10M",
      "$0",
    ]);
  });

  it("draws nothing without balances or spending", () => {
    expect(
      dayByDayChart(
        summaryOf(QUARTER, [
          {
            date: "2026-08-04",
            amount: 3_154_020_000,
            as: SALARY,
            balance: null,
          },
        ]),
      ),
    ).toBeNull();
  });
});
