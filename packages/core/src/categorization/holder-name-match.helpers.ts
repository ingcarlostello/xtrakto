import type { HolderNameMatch } from "./categorization.types";

// Fewer letters than this don't tell a cut word apart: a lone "P" or "MA"
// could start anyone's name.
const MIN_CUT_LETTERS = 3;

type Found = { readonly index: number; readonly isWhole: boolean };

// The holder's next word after `after` that the word is, or, for the last
// word, starts (the bank cuts descriptions at about 30 characters).
const findInHolder = (
  holderWords: readonly string[],
  word: string,
  { after, isLast }: { readonly after: number; readonly isLast: boolean },
): Found | undefined => {
  const whole = holderWords.findIndex((it, at) => at > after && it === word);
  if (whole !== -1) return { index: whole, isWhole: true };
  if (!isLast) return undefined;
  const cut = holderWords.findIndex(
    (it, at) => at > after && it.startsWith(word),
  );
  return cut === -1 ? undefined : { index: cut, isWhole: false };
};

/**
 * How a transfer's words (after `TRANSF A`, folded) name the account holder:
 * `"whole"` when they're whole words of the holder's name, in order, from the
 * first name to a surname (`"ANA PRUEBA"`); `"cut"` when they're the holder's
 * but the bank cut them inside a word or before any surname (`"ANA MARI"`,
 * `"ANA MARIA PRUEB"`): most likely the holder, to confirm; `null` when they
 * name someone else or too little to tell: `"ANA"`, `"ANA MA"`, `"ANA LOPEZ"`,
 * or a sibling's `"JUAN PRUEBA"`.
 */
export const matchHolderName = (
  words: readonly string[],
  holderWords: readonly string[],
): HolderNameMatch | null => {
  const [first, ...rest] = words;
  if (first !== holderWords[0]) return null;
  // A name's last two words are its surnames; a two-word name has one.
  const firstSurname = Math.max(1, holderWords.length - 2);
  let after = 0;
  let matched = 0;
  let isCut = false;
  let reachesSurname = false;
  for (const [position, word] of rest.entries()) {
    const isLast = position === rest.length - 1;
    const found = findInHolder(holderWords, word, { after, isLast });
    if (found === undefined) return null;
    isCut ||= !found.isWhole;
    // A word cut this short neither counts nor contradicts the name.
    if (!found.isWhole && word.length < MIN_CUT_LETTERS) break;
    matched += 1;
    reachesSurname ||= found.index >= firstSurname;
    after = found.index;
  }
  if (matched === 0) return null;
  return reachesSurname && !isCut ? "whole" : "cut";
};
