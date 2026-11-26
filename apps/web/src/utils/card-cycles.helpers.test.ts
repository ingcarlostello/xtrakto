import { localDateSchema, periodSchema } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { monthDays, monthKeyOfDay, pageDays } from "./card-cycles.helpers";

const period = (from: string, to: string) => periodSchema.parse({ from, to });
const day = (date: string) => localDateSchema.parse(date);

// Nu's statements close on the 11th or the 10th: August's, September's and
// November's, without October's.
const NU = [
  period("2026-07-11", "2026-08-11"),
  period("2026-08-12", "2026-09-10"),
  period("2026-10-11", "2026-11-10"),
];
// Bancolombia's close on the 30th.
const BANCOLOMBIA = [period("2026-08-31", "2026-09-30")];

describe("a month's days", () => {
  it("are the calendar's for an account that isn't a card", () => {
    expect(monthDays({ year: 2026, month: 2 }, null)).toEqual(
      period("2026-02-01", "2026-02-28"),
    );
  });

  it("are the cycle a card's statement closes in it", () => {
    expect(monthDays({ year: 2026, month: 9 }, NU)).toEqual(NU[1]);
  });

  it("run between the neighbors' cycles when the month's statement is missing", () => {
    expect(monthDays({ year: 2026, month: 10 }, NU)).toEqual(
      period("2026-09-11", "2026-10-10"),
    );
    // November's opens on the 1st: October ends the day before, whatever
    // day September's closed on.
    const moved = [
      period("2026-08-31", "2026-09-30"),
      period("2026-11-01", "2026-11-30"),
    ];
    expect(monthDays({ year: 2026, month: 10 }, moved)).toEqual(
      period("2026-10-01", "2026-10-31"),
    );
  });

  it("run to the nearest cycle's cut day beyond the card's statements, within shorter months", () => {
    expect(monthDays({ year: 2026, month: 12 }, NU)).toEqual(
      period("2026-11-11", "2026-12-10"),
    );
    // August's is the nearest, which closes on the 11th.
    expect(monthDays({ year: 2026, month: 6 }, NU)).toEqual(
      period("2026-05-12", "2026-06-11"),
    );
    expect(monthDays({ year: 2027, month: 2 }, BANCOLOMBIA)).toEqual(
      period("2027-01-31", "2027-02-28"),
    );
    expect(monthDays({ year: 2026, month: 10 }, BANCOLOMBIA)).toEqual(
      period("2026-10-01", "2026-10-30"),
    );
  });

  it("are the calendar's for a card without a statement", () => {
    expect(monthDays({ year: 2026, month: 9 }, [])).toEqual(
      period("2026-09-01", "2026-09-30"),
    );
  });
});

describe("a page period's days", () => {
  it("are the calendar's for an account that isn't a card", () => {
    expect(pageDays({ kind: "quarter", year: 2026, quarter: 3 }, null)).toEqual(
      period("2026-07-01", "2026-09-30"),
    );
  });

  it("run through a card's cycles, a month's, a quarter's and a year's", () => {
    expect(pageDays({ kind: "month", year: 2026, month: 9 }, NU)).toEqual(
      NU[1],
    );
    expect(pageDays({ kind: "quarter", year: 2026, quarter: 3 }, NU)).toEqual(
      period("2026-06-12", "2026-09-10"),
    );
    expect(pageDays({ kind: "year", year: 2026 }, NU)).toEqual(
      period("2025-12-12", "2026-12-10"),
    );
  });
});

describe("the month a day belongs to", () => {
  it("is its own on an account that isn't a card", () => {
    expect(monthKeyOfDay(day("2026-08-20"), null)).toBe("2026-08");
  });

  it("is the month its card's cycle closes in", () => {
    expect(monthKeyOfDay(day("2026-08-20"), NU)).toBe("2026-09");
    expect(monthKeyOfDay(day("2026-08-11"), NU)).toBe("2026-08");
    expect(monthKeyOfDay(day("2026-09-10"), NU)).toBe("2026-09");
    expect(monthKeyOfDay(day("2026-09-11"), NU)).toBe("2026-10");
    expect(monthKeyOfDay(day("2026-08-31"), BANCOLOMBIA)).toBe("2026-09");
  });
});
