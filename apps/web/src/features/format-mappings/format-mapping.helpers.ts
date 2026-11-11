import { APP_ERROR_CODE, err, ok } from "@xtrakto/core";
import type { ExtractedContent, FormatMapping, Result } from "@xtrakto/core";
import {
  type BankParser,
  findTable,
  mappingParser,
  reconcile,
} from "@xtrakto/parsers";

/** A mapping that reads a file, as its parser, and whether its balances add up. */
export type ProvenMapping = {
  readonly parser: BankParser;
  readonly isVerified: boolean;
};

const notTheHeader: Result<never> = err({
  code: APP_ERROR_CODE.PARSE_FAILED,
  details: { reason: "header" },
});

const isSameHeader = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((name, index) => name === b[index]);

/**
 * Proves a mapping against the file it reads (Stage 11): it must be the
 * header of the file's table and read the whole table; then the balances
 * say whether it holds to the cent. The server proves again what the browser
 * proved, since a mapping comes from the browser.
 */
export const proveMapping = (
  content: ExtractedContent,
  mapping: FormatMapping,
): Result<ProvenMapping> => {
  const table = findTable(content);
  if (!table.ok) return table;
  if (!isSameHeader(table.value.header, mapping.header)) return notTheHeader;
  const parser = mappingParser(mapping);
  const statement = parser.parse(content);
  if (!statement.ok) return statement;
  return ok({
    parser,
    isVerified: reconcile(statement.value).balanceVerified,
  });
};
