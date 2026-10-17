import { foldText } from "../text/text.utils";
import type { TextPattern } from "./categorization.types";

/** A word of a keyword: a whole word, or the start of one (`DROGUER*`). */
type WordPattern = {
  readonly text: string;
  readonly isStem: boolean;
};

/** Words in a row, such as `EMPRESAS PUBLICAS`. */
export type Keyword = readonly WordPattern[];

/** A description folded, and its words, worked out once to try every pattern. */
export type FoldedDescription = {
  readonly text: string;
  readonly words: readonly string[];
};

const STEM_MARK = "*";
const NOT_A_WORD = /[^A-Z0-9]+/;

/**
 * The words of a folded text. Anything that isn't a letter or a digit
 * separates them, so `BOLD*CAFE` holds two words and a masked number
 * (`*******7525`) only its last digits.
 */
export const wordsOf = (foldedText: string): readonly string[] =>
  foldedText.split(NOT_A_WORD).filter((word) => word !== "");

export const foldDescription = (description: string): FoldedDescription => {
  const text = foldText(description);
  return { text, words: wordsOf(text) };
};

export const parseKeyword = (keyword: string): Keyword =>
  keyword
    .split(" ")
    .map((word) =>
      word.endsWith(STEM_MARK)
        ? { text: word.slice(0, -STEM_MARK.length), isStem: true }
        : { text: word, isStem: false },
    );

const matchesWord = (word: string, pattern: WordPattern): boolean =>
  pattern.isStem ? word.startsWith(pattern.text) : word === pattern.text;

const matchesAt = (
  words: readonly string[],
  start: number,
  keyword: Keyword,
): boolean =>
  keyword.every((pattern, offset) => {
    const word = words[start + offset];
    return word !== undefined && matchesWord(word, pattern);
  });

/** Whether the keyword's words appear one after the other, never inside a word. */
export const containsKeyword = (
  words: readonly string[],
  keyword: Keyword,
): boolean => words.some((_, start) => matchesAt(words, start, keyword));

/** Whether the words begin with the prefix's words, each one whole. */
export const startsWithWords = (
  words: readonly string[],
  prefix: readonly string[],
): boolean => prefix.every((word, index) => words[index] === word);

// The words after the first prefix the description starts with, or none.
const afterPrefix = (
  words: readonly string[],
  prefixes: readonly (readonly string[])[],
): readonly string[] | undefined => {
  const prefix = prefixes.find((candidate) =>
    startsWithWords(words, candidate),
  );
  return prefix && words.slice(prefix.length);
};

/** A pattern made into a test of folded descriptions, once. */
export const compilePattern = ({
  is,
  startsWith = [],
  words = [],
}: TextPattern): ((description: FoldedDescription) => boolean) => {
  const prefixes = startsWith.map((prefix) => prefix.split(" "));
  const keywords = words.map(parseKeyword);
  return ({ text, words: descriptionWords }) => {
    if (is !== undefined && text !== is) return false;
    const rest =
      prefixes.length === 0
        ? descriptionWords
        : afterPrefix(descriptionWords, prefixes);
    if (rest === undefined) return false;
    return (
      keywords.length === 0 ||
      keywords.some((keyword) => containsKeyword(rest, keyword))
    );
  };
};
