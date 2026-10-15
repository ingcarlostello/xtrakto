/**
 * A compact amount from tenths of a million, as the app writes them in cards
 * (design-system.md §4): 468 → "$46,8M". Integers only, so a count-up never
 * shows a floating-point slip.
 */
export const compactMillions = (tenths: number): string =>
  `$${Math.floor(tenths / 10)},${tenths % 10}M`;
