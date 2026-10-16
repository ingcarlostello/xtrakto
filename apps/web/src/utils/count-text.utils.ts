/** A noun in singular and plural, as `countText` writes it. */
export type Noun = { readonly one: string; readonly other: string };

const COUNT_FORMAT = new Intl.NumberFormat("es-CO");

/** A count as es-CO writes it: `"1.234"`. */
export const formatCount = (count: number): string =>
  COUNT_FORMAT.format(count);

/** A count with its noun: `"1 movimiento"`, `"1.234 movimientos"`. */
export const countText = (count: number, noun: Noun): string =>
  `${formatCount(count)} ${count === 1 ? noun.one : noun.other}`;
