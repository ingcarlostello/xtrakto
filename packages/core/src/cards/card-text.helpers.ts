import { DATE_ORDER } from "../dates/date.constants";
import { compareLocalDates, parseDateInOrder } from "../dates/date.helpers";
import type { LocalDate, Period } from "../dates/date.types";
import { APP_ERROR_CODE } from "../result/app-error.constants";
import type { Result } from "../result/result.types";
import { err, ok } from "../result/result.utils";
import { PPM_PER_PERCENT } from "./card.constants";

// How card statements write dates, periods and rates (12.2a).

const STARTS_WITH_MONTH = /^\p{L}/u;
// A period's first day without its year, a dash, and its last day whole:
// "31 ago - 30 sep. 2026", "12 AGO - 10 SEP 2026".
const PERIOD_PATTERN = /^(\d{1,2}\s+\p{L}+\.?)\s*-\s*(\S.*)$/u;
// Up to three whole digits and four decimals, apart by a point or a comma.
const PERCENT_PATTERN = /^(\d{1,3})(?:[.,](\d{1,4}))?\s*%?$/;
const RATE_DECIMALS = 4;

const parseError = (): Result<never> =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details: { reason: "format" } });

/**
 * A date as a card statement prints it: its day first, as `"30 sep. 2026"`,
 * `"04 OCT 2026"`, `"10 SEPTIEMBRE 2026"` or `"30/09/2026"`; or its month
 * first with a comma, as Bancolombia's due date, `"oct. 15, 2026"`.
 */
export const parseCardDate = (text: string): Result<LocalDate> => {
  const date = text.trim().replaceAll(",", "");
  const order = STARTS_WITH_MONTH.test(date)
    ? DATE_ORDER.MONTH_DAY_YEAR
    : DATE_ORDER.DAY_MONTH_YEAR;
  return parseDateInOrder(date, order);
};

// A period's first day, printed without its year: the latest day with its
// day and month on or before the period's last.
const startOn = (dayMonth: string, end: LocalDate): Result<LocalDate> => {
  const year = Number(end.slice(0, 4));
  const sameYear = parseDateInOrder(
    `${dayMonth} ${year}`,
    DATE_ORDER.DAY_MONTH_YEAR,
  );
  if (!sameYear.ok || compareLocalDates(sameYear.value, end) <= 0) {
    return sameYear;
  }
  return parseDateInOrder(`${dayMonth} ${year - 1}`, DATE_ORDER.DAY_MONTH_YEAR);
};

/**
 * A card's billed period, its first day without a year: `"31 ago - 30 sep.
 * 2026"` (Bancolombia), `"12 AGO - 10 SEP 2026"` (Nu), and `"16 dic - 15
 * ene. 2027"`, whose first day is of the year before.
 */
export const parseCardPeriod = (text: string): Result<Period> => {
  const match = PERIOD_PATTERN.exec(text.trim());
  if (!match) return parseError();
  const [, startText = "", endText = ""] = match;
  const end = parseCardDate(endText);
  if (!end.ok) return end;
  const start = startOn(startText, end.value);
  return start.ok ? ok({ from: start.value, to: end.value }) : start;
};

/**
 * A rate as a card statement prints it, in parts per million of the amount:
 * `"1.9000 %"` is 19,000, `"1,2000"` 12,000 and `"2.05%"` 20,500. A point or
 * a comma marks up to four decimals, and the percent sign may be left out.
 */
export const parsePercentText = (text: string): Result<number> => {
  const match = PERCENT_PATTERN.exec(text.trim());
  if (!match) return parseError();
  const [, whole = "0", fraction = ""] = match;
  return ok(
    Number(whole) * PPM_PER_PERCENT +
      Number(fraction.padEnd(RATE_DECIMALS, "0")),
  );
};
