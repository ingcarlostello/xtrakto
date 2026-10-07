import { APP_ERROR_CODE } from "./app-error.constants";
import { MINOR_DIGITS } from "./money.constants";
import type { AmountMinor, Currency } from "./money.types";
import type { Result } from "./result.types";
import { err, ok } from "./result.utils";

// Statement text: thousands grouped with commas (or not grouped), up to two decimals.
const AMOUNT_TEXT_PATTERN = /^(-)?(\d{1,3}(?:,\d{3})+|\d+)?(?:\.(\d{1,2}))?$/;
const PLAIN_DECIMAL_PATTERN = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;
const HAS_SUB_CENT_DIGITS_PATTERN = /\.\d{3,}|e/i;
// A double keeps 15 significant decimal digits; beyond that is binary noise.
const DOUBLE_SIGNIFICANT_DIGITS = 15;
// Below 2^46 (about 70 trillion) consecutive doubles are less than a cent
// apart, so a numeric cell still holds its cents exactly. Above it, they don't.
const MAX_EXACT_CELL_VALUE = 2 ** 46;
const MINUS_SIGN = "\u2212";

type ParseFailure = "format" | "range";

const parseError = (reason: ParseFailure): Result<never> =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details: { reason } });

// Callers have already checked that the value is a safe integer.
const toAmountMinor = (value: number): AmountMinor =>
  (value === 0 ? 0 : value) as AmountMinor;

const digitsToAmount = (
  isNegative: boolean,
  integerDigits: string,
  fractionDigits: string,
): Result<AmountMinor> => {
  const minor = Number(
    integerDigits + fractionDigits.padEnd(MINOR_DIGITS, "0"),
  );
  if (!Number.isSafeInteger(minor)) return parseError("range");
  return ok(toAmountMinor(isNegative ? -minor : minor));
};

/** Parses a statement amount such as `"1,234.56"`, `"-15,000.00"` or `".00"`. */
export const parseAmountText = (text: string): Result<AmountMinor> => {
  const match = AMOUNT_TEXT_PATTERN.exec(text.trim());
  if (!match || (match[2] === undefined && match[3] === undefined)) {
    return parseError("format");
  }
  const [, minus, integer = "0", fraction = ""] = match;
  return digitsToAmount(
    minus !== undefined,
    integer.replaceAll(",", ""),
    fraction,
  );
};

/**
 * The decimal that was typed in the cell: the shortest text that round-trips
 * to the same double. If it still has sub-cent digits, retry with the digits a
 * double reliably holds, which removes noise such as `0.1 + 0.2`.
 */
const toTypedDecimal = (value: number): string => {
  const shortest = String(value);
  if (!HAS_SUB_CENT_DIGITS_PATTERN.test(shortest)) return shortest;
  return String(Number(value.toPrecision(DOUBLE_SIGNIFICANT_DIGITS)));
};

/** Converts a numeric spreadsheet cell (`-50000`, `12.34`) without floating-point drift. */
export const amountFromNumber = (value: number): Result<AmountMinor> => {
  if (!Number.isFinite(value)) return parseError("format");
  if (Math.abs(value) >= MAX_EXACT_CELL_VALUE) return parseError("range");
  const match = PLAIN_DECIMAL_PATTERN.exec(toTypedDecimal(value));
  if (!match) return parseError("format");
  const [, minus, integer = "0", fraction = ""] = match;
  return digitsToAmount(minus !== undefined, integer, fraction);
};

/** Adds amounts exactly. Throws if a partial sum leaves the safe integer range. */
export const sumAmounts = (amounts: readonly AmountMinor[]): AmountMinor => {
  let total = 0;
  for (const amount of amounts) {
    total += amount;
    if (!Number.isSafeInteger(total)) {
      throw new RangeError("The sum of amounts exceeds the safe integer range");
    }
  }
  return toAmountMinor(total);
};

// Exact decimal text, so formatting never goes through a floating-point division.
const toDecimalText = (amount: AmountMinor): `${number}` => {
  const digits = String(Math.abs(amount)).padStart(MINOR_DIGITS + 1, "0");
  const sign = amount < 0 ? "-" : "";
  // Built only from a sign, digits and a point, so it is a numeric literal.
  return `${sign}${digits.slice(0, -MINOR_DIGITS)}.${digits.slice(-MINOR_DIGITS)}` as `${number}`;
};

const toDisplayPart = ({ type, value }: Intl.NumberFormatPart): string => {
  if (type === "minusSign") return MINUS_SIGN;
  if (type === "literal" && value.trim() === "") return "";
  return value;
};

/**
 * Formats an amount for display following the design system: `$8.119.555`,
 * negatives with a real minus sign (U+2212) and no space after the symbol, and
 * decimals only when there are cents (`$12,34`).
 */
export const formatAmount = (
  amount: AmountMinor,
  currency: Currency,
  locale = "es-CO",
): string => {
  const hasCents = amount % 10 ** MINOR_DIGITS !== 0;
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: hasCents ? MINOR_DIGITS : 0,
    maximumFractionDigits: MINOR_DIGITS,
  });
  return formatter
    .formatToParts(toDecimalText(amount))
    .map(toDisplayPart)
    .join("");
};
