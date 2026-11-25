import type { CardStatement, Period } from "@xtrakto/core";

/**
 * What a card's statement says before its movements, whatever its bank: its
 * holder, the card's last 4 digits, the billed period and the card's figures.
 */
export type CardHeader = {
  readonly holderName: string;
  readonly accountLast4: string;
  readonly period: Period;
  readonly card: CardStatement;
};
