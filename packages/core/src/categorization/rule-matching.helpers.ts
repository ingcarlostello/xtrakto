/** A word of a keyword: a whole word, or the start of one (`DROGUER*`). */
type WordPattern = {
  readonly text: string;
  readonly isStem: boolean;
};

/** Words in a row, such as `EMPRESAS PUBLICAS`. */
export type Keyword = readonly WordPattern[];

const STEM_MARK = "*";
const NOT_A_WORD = /[^A-Z0-9]+/;

/**
 * The words of a folded text. Anything that isn't a letter or a digit
 * separates them, so `BOLD*CAFE` holds two words and a masked number
 * (`*******7525`) only its last digits.
 */
export const wordsOf = (foldedText: string): readonly string[] =>
  foldedText.split(NOT_A_WORD).filter((word) => word !== "");

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
