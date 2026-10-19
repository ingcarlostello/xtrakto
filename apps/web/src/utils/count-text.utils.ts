/** A noun in singular and plural, as `countText` writes it. */
export type Noun = { readonly one: string; readonly other: string };

const COUNT_FORMAT = new Intl.NumberFormat("es-CO");

/** A count as es-CO writes it: `"1.234"`. */
export const formatCount = (count: number): string =>
  COUNT_FORMAT.format(count);

/** The word that goes with a count: `"cuenta como"` for 1, `"cuentan como"` for any other. */
export const wordFor = (count: number, { one, other }: Noun): string =>
  count === 1 ? one : other;

/** A count with its noun: `"1 movimiento"`, `"1.234 movimientos"`. */
export const countText = (count: number, noun: Noun): string =>
  `${formatCount(count)} ${wordFor(count, noun)}`;
