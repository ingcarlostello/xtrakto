import { describe, expect, it } from "vitest";
import {
  formatDayInWords,
  formatDayRange,
  formatDaysInWords,
  formatMonthName,
  formatMonthRange,
  formatQuarter,
  formatShortDay,
  formatShortMonth,
  formatTimeOfDay,
  formatWeekdayInWords,
  monthWeeks,
} from "./date-display.helpers";
import { localDateSchema, periodSchema } from "./date.schemas";

const period = (from: string, to: string) => periodSchema.parse({ from, to });

describe("formatDayInWords", () => {
  it.each([
    ["2026-11-01", "1 de noviembre"],
    ["2027-01-01", "1 de enero"],
    ["2026-09-30", "30 de septiembre"],
  ])("writes %s as %s", (date, expected) => {
    expect(formatDayInWords(localDateSchema.parse(date))).toBe(expected);
  });
});

describe("formatDaysInWords", () => {
  it.each([
    {
      days: "one day",
      from: "2026-07-10",
      to: "2026-07-10",
      text: "el 10 de julio",
    },
    {
      days: "days of one month",
      from: "2026-07-10",
      to: "2026-07-18",
      text: "del 10 al 18 de julio",
    },
    {
      days: "days across two months",
      from: "2026-07-28",
      to: "2026-08-03",
      text: "del 28 de julio al 3 de agosto",
    },
  ])("writes $days", ({ from, to, text }) => {
    expect(formatDaysInWords(period(from, to))).toBe(text);
  });
});

describe("formatQuarter", () => {
  it.each([
    [1, "Ene – mar 2026"],
    [3, "Jul – sep 2026"],
    [4, "Oct – dic 2026"],
  ])("names quarter %i of 2026 %s", (quarter, expected) => {
    expect(formatQuarter({ year: 2026, quarter })).toBe(expected);
  });

  it.each([
    [7, "Julio"],
    [9, "Septiembre"],
  ])("names month %i %s", (month, expected) => {
    expect(formatMonthName({ year: 2026, month })).toBe(expected);
  });
});

describe("formatShortMonth", () => {
  it.each([
    [7, "jul"],
    [9, "sep"],
    [12, "dic"],
  ])("writes month %i short, as under a bar: %s", (month, expected) => {
    expect(formatShortMonth({ year: 2026, month })).toBe(expected);
  });
});

describe("formatShortDay", () => {
  it.each([
    ["2026-06-30", "30 jun"],
    ["2026-09-30", "30 sep"],
    ["2026-12-01", "1 dic"],
  ])("writes %s on a chart's axis as %s", (date, expected) => {
    expect(formatShortDay(localDateSchema.parse(date))).toBe(expected);
  });
});

describe("monthWeeks", () => {
  it("lays a month out by week, Monday first, empty around its days", () => {
    expect(monthWeeks({ year: 2026, month: 10 })).toEqual([
      [null, null, null, 1, 2, 3, 4],
      [5, 6, 7, 8, 9, 10, 11],
      [12, 13, 14, 15, 16, 17, 18],
      [19, 20, 21, 22, 23, 24, 25],
      [26, 27, 28, 29, 30, 31, null],
    ]);
  });

  it("fills whole weeks when a month starts on a Monday and ends on a Sunday", () => {
    const weeks = monthWeeks({ year: 2027, month: 2 });

    expect(weeks).toHaveLength(4);
    expect(weeks[0]).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(weeks.at(-1)).toEqual([22, 23, 24, 25, 26, 27, 28]);
  });

  it("takes six weeks for a long month that starts late in the week", () => {
    const weeks = monthWeeks({ year: 2026, month: 8 });

    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toEqual([null, null, null, null, null, 1, 2]);
    expect(weeks.at(-1)).toEqual([31, null, null, null, null, null, null]);
  });
});

describe("formatWeekdayInWords", () => {
  it.each([
    ["2026-09-30", "Miércoles 30 de septiembre"],
    ["2026-10-03", "Sábado 3 de octubre"],
    ["2026-01-01", "Jueves 1 de enero"],
  ])("heads %s as %s", (date, expected) => {
    expect(
      formatWeekdayInWords(localDateSchema.parse(date), { withYear: false }),
    ).toBe(expected);
  });

  it("adds the year when asked", () => {
    expect(
      formatWeekdayInWords(localDateSchema.parse("2025-12-31"), {
        withYear: true,
      }),
    ).toBe("Miércoles 31 de diciembre de 2025");
  });
});

describe("formatMonthRange", () => {
  it.each([
    [
      "a quarter that opens on the previous month's last day",
      "2026-06-30",
      "2026-09-30",
      "jul–sep 2026",
    ],
    [
      "a quarter that opens on its first day",
      "2026-07-01",
      "2026-09-30",
      "jul–sep 2026",
    ],
    [
      "a quarter after the year's last day",
      "2026-12-31",
      "2027-03-31",
      "ene–mar 2027",
    ],
    ["one month", "2026-07-31", "2026-08-31", "ago 2026"],
    [
      "months across two years",
      "2026-11-30",
      "2027-02-28",
      "dic 2026 – feb 2027",
    ],
    ["a period of one day", "2026-08-31", "2026-08-31", "ago 2026"],
  ])("writes %s by its months", (_case, from, to, expected) => {
    expect(formatMonthRange(period(from, to))).toBe(expected);
  });
});

describe("formatDayRange", () => {
  it.each([
    ["days of one month", "2026-08-01", "2026-08-15", "1–15 ago 2026"],
    ["a single day", "2026-08-03", "2026-08-03", "3 ago 2026"],
    [
      "days across two months",
      "2026-07-28",
      "2026-08-03",
      "28 jul – 3 ago 2026",
    ],
    [
      "days across two years",
      "2026-12-28",
      "2027-01-03",
      "28 dic 2026 – 3 ene 2027",
    ],
    [
      "September as the design abbreviates it",
      "2026-09-01",
      "2026-09-30",
      "1–30 sep 2026",
    ],
  ])("writes %s", (_case, from, to, expected) => {
    expect(formatDayRange(period(from, to))).toBe(expected);
  });
});

describe("formatTimeOfDay", () => {
  it.each([
    ["2026-10-28T13:42:00Z", "8:42 a.\u00a0m."],
    ["2026-10-28T23:05:00Z", "6:05 p.\u00a0m."],
    // 03:30 UTC is the evening before in Bogotá.
    ["2026-10-29T03:30:00Z", "10:30 p.\u00a0m."],
    ["2026-10-28T05:05:00Z", "12:05 a.\u00a0m."],
    ["2026-10-28T17:00:00Z", "12:00 p.\u00a0m."],
  ])("writes %s as %j in Bogotá", (instant, expected) => {
    expect(formatTimeOfDay(new Date(instant), "America/Bogota")).toBe(expected);
  });
});
