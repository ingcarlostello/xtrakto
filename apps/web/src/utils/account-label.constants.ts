import type { AccountType } from "@xtrakto/core";

// How screens name an account: its type, its bank and its last 4 digits.

export const BANK_LABELS = { bancolombia: "Bancolombia" } as const;

export const ACCOUNT_TYPE_LABELS = {
  savings: "Cuenta de ahorros",
  credit_card: "Tarjeta de crédito",
} as const satisfies Record<AccountType, string>;

/** How an account number shows: only its last 4 digits. */
export const MASKED_DIGITS = "••••";
