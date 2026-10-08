import { APP_ERROR_CODE, err, ok } from "@xtrakto/core";
import type { BankParser, ParserRegistry } from "./bank-parser.types";

// Each id is stored as a statement's format, so two parsers can't share one.
const assertUniqueIds = (parsers: readonly BankParser[]): void => {
  const ids = new Set<string>();
  for (const { id } of parsers) {
    if (ids.has(id)) throw new Error(`Duplicate parser id: ${id}`);
    ids.add(id);
  }
};

/**
 * Builds the fixed list of parsers that format detection tries, in order.
 * Content that no parser recognizes is `UNKNOWN_FORMAT`.
 */
export const createParserRegistry = (
  parsers: readonly BankParser[],
): ParserRegistry => {
  assertUniqueIds(parsers);
  return {
    findParser: (content) => {
      const parser = parsers.find((candidate) => candidate.canParse(content));
      return parser ? ok(parser) : err({ code: APP_ERROR_CODE.UNKNOWN_FORMAT });
    },
  };
};
