import {
  amountMinorSchema,
  type CategorizationRuleId,
  type CategoryId,
  localDateSchema,
} from "@xtrakto/core";
import type { PeriodMovement } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";
import { categoryWeeks, weeklyChart } from "./category-weeks.helpers";

const QUARTER: MovementPeriod = { kind: "quarter", year: 2026, quarter: 3 };
const AUGUST: MovementPeriod = { kind: "month", year: 2026, month: 8 };

type Row = readonly [
  date: string,
  amount: number,
  as?: readonly [CategoryId, CategorizationRuleId],
];

const FOOD = ["restaurants", "merchant_restaurants"] as const;
const CASH = ["cash_withdrawal", "cash_withdrawal"] as const;
const SALARY = ["income_transfer", "interbank_in"] as const;

const movement = ([date, amount, [categoryId, rule] = FOOD]: Row) =>
  ({
    date: localDateSchema.parse(date),
    amountMinor: amountMinorSchema.parse(amount),
    balanceAfterMinor: null,
    descriptionRaw: "COMPRA EN  APP DOMICILIOS",
    referenceHash: null,
    referenceLast4: null,
    categoryId,
    categoryRuleId: rule,
  }) satisfies PeriodMovement;

type Shown = { period?: MovementPeriod; categoryId?: CategoryId };

const detailOf = (
  rows: readonly Row[],
  { period = QUARTER, categoryId = "restaurants" }: Shown = {},
) => ({ period, categoryId, movements: rows.map(movement) });

// $50.000 a week from 1 July, but none the week of 29 July and $410.000
// in two the week of 5 August; the salary on 29 September is the account's
// last movement.
const QUARTER_ROWS: readonly Row[] = [
  ["2026-07-03", -5_000_000],
  ["2026-07-10", -5_000_000],
  ["2026-07-17", -5_000_000],
  ["2026-07-24", -5_000_000],
  ["2026-08-05", -20_000_000],
  ["2026-08-07", -21_000_000],
  ["2026-08-13", -5_000_000],
  ["2026-08-20", -5_000_000],
  ["2026-08-27", -5_000_000],
  ["2026-09-03", -5_000_000],
  ["2026-09-10", -5_000_000],
  ["2026-09-17", -5_000_000],
  ["2026-09-24", -5_000_000],
  ["2026-09-29", 320_000_000, SALARY],
];

describe("categoryWeeks", () => {
  it("cuts the period in weeks from its first day, through the account's last day with movements", () => {
    const weeks = categoryWeeks(detailOf(QUARTER_ROWS));

    expect(weeks).toHaveLength(13);
    expect(weeks.slice(3, 6)).toEqual([
      {
        from: "2026-07-22",
        to: "2026-07-28",
        amountMinor: 5_000_000,
        count: 1,
      },
      { from: "2026-07-29", to: "2026-08-04", amountMinor: 0, count: 0 },
      {
        from: "2026-08-05",
        to: "2026-08-11",
        amountMinor: 41_000_000,
        count: 2,
      },
    ]);
    expect(weeks.at(-1)).toMatchObject({
      from: "2026-09-23",
      to: "2026-09-29",
    });
  });

  it("ends the last week with the period, shorter", () => {
    const weeks = categoryWeeks(
      detailOf([...QUARTER_ROWS, ["2026-09-30", -1_000_000]]),
    );

    expect(weeks).toHaveLength(14);
    expect(weeks.at(-1)).toEqual({
      from: "2026-09-30",
      to: "2026-09-30",
      amountMinor: 1_000_000,
      count: 1,
    });
  });

  it("stops at the account's last day with movements", () => {
    const weeks = categoryWeeks(
      detailOf(QUARTER_ROWS.filter(([date]) => date <= "2026-08-20")),
    );

    expect(weeks.map(({ from }) => from).at(-1)).toBe("2026-08-19");
    expect(weeks).toHaveLength(8);
  });

  it("finds no weeks without movements", () => {
    expect(categoryWeeks(detailOf([]))).toEqual([]);
  });
});

describe("weeklyChart", () => {
  it("draws each week on round amounts over the quarter's days, and points out the week that stands out", () => {
    const chart = weeklyChart(detailOf(QUARTER_ROWS));

    expect(chart?.yTicks).toEqual([
      { label: "$600 mil", at: 0 },
      { label: "$400 mil", at: 33.33 },
      { label: "$200 mil", at: 66.67 },
      { label: "$0", at: 100 },
    ]);
    expect(chart?.xTicks).toEqual([
      { label: "1 jul", at: 0 },
      { label: "1 ago", at: 34.07 },
      { label: "1 sep", at: 68.13 },
      { label: "30 sep", at: 100 },
    ]);
    expect(chart?.points).toHaveLength(13);
    expect(chart?.points.slice(4, 6)).toEqual([
      { x: 30.77, y: 100 },
      { x: 38.46, y: 31.67 },
    ]);
    expect(chart?.line.startsWith("0,91.67 7.69,91.67 ")).toBe(true);
    expect(chart?.area.startsWith("0,100 0,91.67 ")).toBe(true);
    expect(chart?.area.endsWith(" 92.31,91.67 92.31,100")).toBe(true);
    expect(chart?.event).toEqual({
      x: 38.46,
      y: 31.67,
      title: "Semana del 5 de agosto: $410.000",
      detail: "2 movimientos. Una semana normal es de $50 mil.",
    });
    expect(chart?.label).toBe(
      "Gasto en «Restaurantes y domicilios» por semana, del 1 de julio al 29 de septiembre. La semana con más fue la del 5 de agosto: $410.000.",
    );
  });

  it("marks a month's weeks under it", () => {
    const august = QUARTER_ROWS.filter(([date]) => date.startsWith("2026-08"));
    const chart = weeklyChart(
      detailOf([...august, ["2026-08-31", 1_000_000, SALARY]], {
        period: AUGUST,
      }),
    );

    expect(chart?.xTicks.map(({ label }) => label)).toEqual([
      "1 ago",
      "8 ago",
      "15 ago",
      "22 ago",
      "29 ago",
    ]);
    expect(chart?.points).toHaveLength(5);
  });

  it("points out no week when every week took about the same", () => {
    const steady = QUARTER_ROWS.filter(
      ([date]) => date !== "2026-08-05" && date !== "2026-08-07",
    );
    const chart = weeklyChart(detailOf(steady));

    expect(chart?.event).toBeUndefined();
    expect(chart?.label).toBe(
      "Gasto en «Restaurantes y domicilios» por semana, del 1 de julio al 29 de septiembre. La semana con más fue la del 1 de julio: $50.000.",
    );
  });

  it("says when most weeks took nothing", () => {
    const chart = weeklyChart(
      detailOf(
        [
          ["2026-07-20", -30_000_000, CASH],
          ["2026-09-02", -20_000_000, CASH],
          ["2026-09-29", 320_000_000, SALARY],
        ],
        { categoryId: "cash_withdrawal" },
      ),
    );

    expect(chart?.event).toMatchObject({
      title: "Semana del 15 de julio: $300.000",
      detail:
        "1 movimiento. La mayoría de las semanas no tuvo gasto en «Efectivo».",
    });
  });

  it("draws nothing when the category took nothing in the period", () => {
    expect(
      weeklyChart(detailOf([["2026-09-29", 320_000_000, SALARY]])),
    ).toBeNull();
  });
});
