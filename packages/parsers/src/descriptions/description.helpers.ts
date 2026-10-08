const WHITESPACE_RUN = /\s+/g;

/**
 * The description used to compare and group movements: spacing that differs
 * between files ("COMPRA EN  TIENDA") doesn't make two movements different.
 * Letter case and accents stay as the bank wrote them.
 */
export const normalizeDescription = (description: string): string =>
  description.replace(WHITESPACE_RUN, " ").trim();
