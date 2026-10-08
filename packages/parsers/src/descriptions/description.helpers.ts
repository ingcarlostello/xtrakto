import type { ParsedTransaction } from "@xtrakto/core";

const WHITESPACE_RUN = /\s+/g;
// Account, ID and phone numbers: the privacy rules forbid keeping them whole.
const LONG_NUMBER = /\d{6,}/g;
const VISIBLE_DIGITS = 4;

/**
 * Hides all but the last four digits of every run of six or more digits,
 * keeping the text's length: "INTERES INV VIRT 27608017525" becomes
 * "INTERES INV VIRT *******7525".
 */
export const maskLongNumbers = (description: string): string =>
  description.replace(
    LONG_NUMBER,
    (digits) =>
      "*".repeat(digits.length - VISIBLE_DIGITS) +
      digits.slice(-VISIBLE_DIGITS),
  );

/**
 * The description used to compare and group movements: spacing that differs
 * between files ("COMPRA EN  TIENDA") doesn't make two movements different.
 * Letter case and accents stay as the bank wrote them.
 */
export const normalizeDescription = (description: string): string =>
  description.replace(WHITESPACE_RUN, " ").trim();

/**
 * Both descriptions of a movement from its printed text, with long numbers
 * masked in each (ADR 0012). The raw one keeps the bank's spacing and case.
 */
export const movementDescriptions = (
  text: string,
): Pick<ParsedTransaction, "descriptionRaw" | "descriptionNormalized"> => {
  const descriptionRaw = maskLongNumbers(text);
  return {
    descriptionRaw,
    descriptionNormalized: normalizeDescription(descriptionRaw),
  };
};
