import type { CURRENCY } from "./money.constants";

declare const amountMinorBrand: unique symbol;

/**
 * An amount as a safe integer number of minor units (cents). Only the money
 * helpers create one, so a plain number can't be mistaken for an amount.
 */
export type AmountMinor = number & { readonly [amountMinorBrand]: true };

export type Currency = (typeof CURRENCY)[keyof typeof CURRENCY];
