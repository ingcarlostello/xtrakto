import { BANKS } from "@xtrakto/core";
import type { AccountType } from "@xtrakto/core";

// How screens name an account: its type, its bank and its last 4 digits.

/** Each bank's name, as core lists them; another bank's, without one (Stage 11). */
export const BANK_LABELS: Readonly<Partial<Record<string, string>>> = {
  ...Object.fromEntries(BANKS.map(({ id, labelEs }) => [id, labelEs])),
  other: "Otro banco",
};

export const ACCOUNT_TYPE_LABELS = {
  savings: "Cuenta de ahorros",
  credit_card: "Tarjeta de crédito",
} as const satisfies Record<AccountType, string>;

/** How an account number shows: only its last 4 digits. */
export const MASKED_DIGITS = "••••";
