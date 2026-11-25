import { ok, parseAmountWithSeparator } from "@xtrakto/core";
import type { AmountMinor, Result } from "@xtrakto/core";
import { decimalSeparatorOf } from "../format-mapping/mapping-formats.helpers";

/**
 * An amount as a card's statement writes it, by the separator its cents say:
 * `"1.234,56"`, `"1.234.567,8"`, Bancolombia's minimum `"123,456.00"`, and
 * with its sign, `"$ -150.000,00"` or Nu's `"- $1.234,56"`.
 */
export const readCardAmount = (text: string): Result<AmountMinor> =>
  parseAmountWithSeparator(text, decimalSeparatorOf([text]));

/** The values of several readers in turn, or the first failure. */
export const readAll = <T extends object>(readers: {
  readonly [K in keyof T]: () => Result<T[K]>;
}): Result<T> => {
  const values: Partial<T> = {};
  // Safe: Object.keys types keys as string, and these are the keys of T.
  for (const key of Object.keys(readers) as (keyof T)[]) {
    const value = readers[key]();
    if (!value.ok) return value;
    values[key] = value.value;
  }
  // Safe: the loop set every reader's value or returned.
  return ok(values as T);
};
