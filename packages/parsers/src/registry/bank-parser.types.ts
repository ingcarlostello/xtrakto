import type { ExtractedContent, ParsedStatement, Result } from "@xtrakto/core";

/**
 * Reads one statement format from the content extracted in the browser. Every
 * parser follows this contract, so supporting a new format means registering
 * a new parser, without changing the code that uses them.
 */
export type BankParser = {
  /** Format id, stored with each statement: "bancolombia-savings-quarterly". */
  readonly id: string;
  /** Bank the format belongs to: "bancolombia". */
  readonly bankId: string;
  /** Recognizes the format by its signature, such as a header row. Never throws. */
  readonly canParse: (content: ExtractedContent) => boolean;
  /**
   * Returns a statement that satisfies `parsedStatementSchema`, with this
   * parser's `id` as `formatId` and its `bankId`. Content that doesn't follow
   * the format is an expected error (`PARSE_FAILED`), never an exception.
   */
  readonly parse: (content: ExtractedContent) => Result<ParsedStatement>;
  /**
   * The content with only what `parse` reads, for content this parser
   * recognizes: what leaves the browser (ADR 0017). Pure and idempotent; rows
   * keep their positions, so `parse(minimize(content))` gives the same result
   * as `parse(content)`. Never throws.
   */
  readonly minimize: (content: ExtractedContent) => ExtractedContent;
};

export type ParserRegistry = {
  /** The first parser, in registry order, that recognizes the content. */
  readonly findParser: (content: ExtractedContent) => Result<BankParser>;
};
