import { describe, expect, it } from "vitest";
import { APP_ERROR_CODE } from "../result/app-error.constants";
import { DEFAULT_TIME_ZONE } from "./date.constants";
import {
  compareLocalDates,
  inferDayMonthDate,
  isLocalDate,
  isWithinPeriod,
  localDateFromExcelSerial,
  localDateFromInstant,
  parseSlashDate,
} from "./date.helpers";
import type { ExcelDateTimeZones, LocalDate, Period } from "./date.types";
import { err, ok } from "../result/result.utils";

const parseFailure = (reason: string) =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details: { reason } });

const date = (slashDate: string): LocalDate => {
  const result = parseSlashDate(slashDate);
  if (!result.ok) throw new Error(`Invalid test date: ${slashDate}`);
  return result.value;
};

const period = (from: string, to: string): Period => ({
  from: date(from),
  to: date(to),
});

// Bancolombia's movements export: local midnight stored as 05:00 UTC.
const BANCOLOMBIA_EXPORT: ExcelDateTimeZones = {
  serialTimeZone: "UTC",
  targetTimeZone: DEFAULT_TIME_ZONE,
};

// Excel serials, from Date.UTC: days since 1899-12-30.
const SERIAL_2026_07_01 = 46_204;
const SERIAL_2026_01_01 = 46_023;
const SERIAL_2024_02_29 = 45_351;
const HOUR = 1 / 24;

describe("compareLocalDates", () => {
  it("sorts dates in calendar order across months and years", () => {
    const dates = [date("2026/01/02"), date("2025/12/31"), date("2026/01/01")];

    expect([...dates].sort(compareLocalDates)).toEqual([
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
    ]);
  });

  it("returns zero for the same day", () => {
    expect(compareLocalDates(date("2026/07/01"), date("2026/07/01"))).toBe(0);
  });
});

describe("isWithinPeriod", () => {
  const quarter = period("2026/06/30", "2026/09/30");

  it.each([
    { day: "2026/06/30", isInside: true },
    { day: "2026/08/15", isInside: true },
    { day: "2026/09/30", isInside: true },
    { day: "2026/06/29", isInside: false },
    { day: "2026/10/01", isInside: false },
  ])("returns $isInside for $day, both ends included", ({ day, isInside }) => {
    expect(isWithinPeriod(date(day), quarter)).toBe(isInside);
  });
});

describe("localDateFromInstant", () => {
  // Date.UTC months are 0-based: 6 is July.
  it("converts 05:00 UTC to the same day in Bogotá", () => {
    const instant = new Date(Date.UTC(2026, 6, 1, 5, 0));

    expect(localDateFromInstant(instant, DEFAULT_TIME_ZONE)).toBe("2026-07-01");
  });

  it("converts 04:59 UTC to the previous day in Bogotá", () => {
    const instant = new Date(Date.UTC(2026, 6, 1, 4, 59));

    expect(localDateFromInstant(instant, DEFAULT_TIME_ZONE)).toBe("2026-06-30");
  });

  it("uses the given time zone", () => {
    const instant = new Date(Date.UTC(2026, 5, 30, 20, 0));

    expect(localDateFromInstant(instant, "UTC")).toBe("2026-06-30");
    expect(localDateFromInstant(instant, "Asia/Tokyo")).toBe("2026-07-01");
  });

  it("throws on an unknown time zone, which is a bug", () => {
    const instant = new Date(Date.UTC(2026, 6, 1));

    expect(() => localDateFromInstant(instant, "Mars/Olympus")).toThrow(
      RangeError,
    );
  });

  it("throws on an invalid instant", () => {
    expect(() =>
      localDateFromInstant(new Date(Number.NaN), DEFAULT_TIME_ZONE),
    ).toThrow(RangeError);
  });
});

describe("localDateFromExcelSerial", () => {
  it.each([
    {
      label: "a 05:00 UTC date to the correct local day",
      serial: SERIAL_2026_07_01 + 5 * HOUR,
      expected: "2026-07-01",
    },
    {
      label: "23:00 UTC (18:00 in Bogotá) to the same day",
      serial: SERIAL_2026_07_01 + 23 * HOUR,
      expected: "2026-07-01",
    },
    {
      label: "04:00 UTC (23:00 in Bogotá) to the previous day",
      serial: SERIAL_2026_07_01 + 4 * HOUR,
      expected: "2026-06-30",
    },
    {
      label: "the first day of the year",
      serial: SERIAL_2026_01_01 + 5 * HOUR,
      expected: "2026-01-01",
    },
    {
      label: "the last day of the year",
      serial: SERIAL_2026_01_01 - 1 + 5 * HOUR,
      expected: "2025-12-31",
    },
    {
      label: "a leap day",
      serial: SERIAL_2024_02_29 + 5 * HOUR,
      expected: "2024-02-29",
    },
  ])("converts $label", ({ serial, expected }) => {
    expect(localDateFromExcelSerial(serial, BANCOLOMBIA_EXPORT)).toEqual(
      ok(expected),
    );
  });

  it("reads a serial stored in local time as that same day", () => {
    const localTime = {
      serialTimeZone: DEFAULT_TIME_ZONE,
      targetTimeZone: DEFAULT_TIME_ZONE,
    };

    expect(localDateFromExcelSerial(SERIAL_2026_07_01, localTime)).toEqual(
      ok("2026-07-01"),
    );
    expect(
      localDateFromExcelSerial(SERIAL_2026_07_01 + 23.9 * HOUR, localTime),
    ).toEqual(ok("2026-07-01"));
  });

  it("accepts the first and last serials Excel represents reliably", () => {
    const utc = { serialTimeZone: "UTC", targetTimeZone: "UTC" };

    expect(localDateFromExcelSerial(61, utc)).toEqual(ok("1900-03-01"));
    expect(localDateFromExcelSerial(2_958_465, utc)).toEqual(ok("9999-12-31"));
  });

  it.each([
    { label: "serial 60, the nonexistent 1900-02-29", serial: 60 },
    { label: "serial 0", serial: 0 },
    { label: "a negative serial", serial: -1 },
    { label: "a serial after 9999-12-31", serial: 2_958_466 },
  ])("rejects $label as out of range", ({ serial }) => {
    expect(localDateFromExcelSerial(serial, BANCOLOMBIA_EXPORT)).toEqual(
      parseFailure("range"),
    );
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("rejects %s", (serial) => {
    expect(localDateFromExcelSerial(serial, BANCOLOMBIA_EXPORT)).toEqual(
      parseFailure("format"),
    );
  });
});

describe("parseSlashDate", () => {
  it.each([
    { text: "2026/06/30", expected: "2026-06-30" },
    { text: "2024/02/29", expected: "2024-02-29" },
    { text: " 2026/09/30 ", expected: "2026-09-30" },
  ])("parses $text", ({ text, expected }) => {
    expect(parseSlashDate(text)).toEqual(ok(expected));
  });

  it.each([
    "2026/02/29",
    "2026/06/31",
    "2026/13/01",
    "2026/00/10",
    "2026-06-30",
    "2026/6/30",
    "26/06/30",
    "30/06/2026",
    "",
    "DESDE",
  ])("rejects %j", (text) => {
    expect(parseSlashDate(text)).toEqual(parseFailure("format"));
  });
});

describe("inferDayMonthDate", () => {
  const quarter = period("2026/06/30", "2026/09/30");

  it.each([
    { text: "30/06", expected: "2026-06-30" },
    { text: "1/07", expected: "2026-07-01" },
    { text: "01/07", expected: "2026-07-01" },
    { text: "29/09", expected: "2026-09-29" },
    { text: "30/09", expected: "2026-09-30" },
  ])("resolves $text inside the quarter to $expected", ({ text, expected }) => {
    expect(inferDayMonthDate(text, quarter)).toEqual(ok(expected));
  });

  it.each([
    { text: "31/12", expected: "2025-12-31" },
    { text: "1/01", expected: "2026-01-01" },
    { text: "15/03", expected: "2026-03-15" },
  ])(
    "resolves $text in a period that crosses the year to $expected",
    ({ text, expected }) => {
      const rollover = period("2025/12/31", "2026/03/31");

      expect(inferDayMonthDate(text, rollover)).toEqual(ok(expected));
    },
  );

  it("resolves 29/02 in a leap year", () => {
    const leapQuarter = period("2027/12/31", "2028/03/31");

    expect(inferDayMonthDate("29/02", leapQuarter)).toEqual(ok("2028-02-29"));
  });

  it("rejects 29/02 when the period has no leap day", () => {
    const plainQuarter = period("2026/12/31", "2027/03/31");

    expect(inferDayMonthDate("29/02", plainQuarter)).toEqual(
      parseFailure("out_of_period"),
    );
  });

  it.each(["29/06", "1/10"])(
    "rejects %s, which falls outside the period",
    (text) => {
      expect(inferDayMonthDate(text, quarter)).toEqual(
        parseFailure("out_of_period"),
      );
    },
  );

  it.each([
    "31/02",
    "32/01",
    "0/01",
    "1/13",
    "1/0",
    "1-07",
    "1/07/2026",
    "",
    "FECHA",
    "SUCURSAL",
  ])("rejects %j as an invalid date", (text) => {
    expect(inferDayMonthDate(text, quarter)).toEqual(parseFailure("format"));
  });

  it("rejects a day that occurs twice in a period longer than a year", () => {
    const twoYears = period("2025/01/01", "2026/12/31");

    expect(inferDayMonthDate("1/07", twoYears)).toEqual(
      parseFailure("ambiguous"),
    );
  });
});

describe("isLocalDate", () => {
  it.each(["2026-07-01", "2024-02-29", "1900-03-01"])("accepts %s", (value) => {
    expect(isLocalDate(value)).toBe(true);
  });

  it.each([
    "2026-02-29",
    "2026-13-01",
    "2026-06-31",
    "2026-7-01",
    "2026/07/01",
    " 2026-07-01",
    "2026-07-01T00:00:00Z",
    20_260_701,
    null,
    undefined,
  ])("rejects %j", (value) => {
    expect(isLocalDate(value)).toBe(false);
  });
});
