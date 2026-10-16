import type { AmountMinor } from "@xtrakto/core";
import { or, type SQL, sql } from "drizzle-orm";
import { transactions } from "./transaction.schemas";

/** What someone looks for among their movements: a text, and an amount when the text is one. */
export type MovementSearch = {
  readonly text: string;
  /** Matched with either sign: "$90.000" finds −$90.000 and +$90.000. */
  readonly amountMinor?: AmountMinor;
};

// Spanish accents and ñ, folded the same way in SQL and here, so the query
// and the bank's text compare alike whatever the database's locale. Other
// accented letters, rare in Colombian bank text, are compared as they are.
const ACCENTED = "ÁÉÍÓÚÜÑáéíóúüñ";
const PLAIN = "AEIOUUNaeiouun";
const FOLDED = new Map([...ACCENTED].map((letter, i) => [letter, PLAIN[i]]));

/** Lowercase, without accents or extra spaces: how a search compares text. */
export const foldSearchText = (text: string): string =>
  [...text]
    .map((letter) => FOLDED.get(letter) ?? letter)
    .join("")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * The movements a search finds: those whose normalized description holds
 * the text, folded alike, or whose amount is the one typed. Nothing to look
 * for finds everything.
 */
export const matchesSearch = ({
  text,
  amountMinor,
}: MovementSearch): SQL | undefined => {
  const folded = foldSearchText(text);
  return or(
    folded === ""
      ? undefined
      : sql`strpos(lower(translate(${transactions.descriptionNormalized}, ${ACCENTED}, ${PLAIN})), ${folded}) > 0`,
    amountMinor === undefined
      ? undefined
      : sql`abs(${transactions.amountMinor}) = ${amountMinor}`,
  );
};
