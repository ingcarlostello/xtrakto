// How a row of movements reads (design-system.md §9): Movimientos's, a
// category's, and the user's rules.

/**
 * The bank's text exactly as printed: its case, its cuts and its double
 * spaces (§4), wrapping only where it has a space.
 */
export const BANK_TEXT = "tracking-[0.02em] break-words whitespace-pre-wrap";

/**
 * A link that covers its whole row, and so does its focus ring. The row is
 * `relative`.
 */
export const ROW_LINK =
  "after:absolute after:inset-0 after:rounded-md hover:underline focus-visible:outline-none focus-visible:after:outline-[3px] focus-visible:after:outline-offset-[3px] focus-visible:after:outline-primary focus-visible:after:outline-solid";
