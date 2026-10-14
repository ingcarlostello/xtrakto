import { describe, expect, it } from "vitest";
import {
  formatDayInWords,
  formatDayRange,
  formatMonthRange,
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
