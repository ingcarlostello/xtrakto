import { ACCOUNT_TYPE } from "@xtrakto/core";
import type {
  ExtractedContent,
  FormatMapping,
  ParsedStatement,
  Result,
} from "@xtrakto/core";
import type { BankParser } from "../registry/bank-parser.types";
import { parseFailed } from "../registry/parse-failure.helpers";
import { firstSheetRows } from "../sheets/sheet.utils";
import { MAPPED_FORMAT_ID } from "./format-mapping.constants";
import { minimizeMapped } from "./mapping-minimize.helpers";
import { readTable } from "./mapping-rows.helpers";
import { mappedStatement } from "./mapping-statement.helpers";
import { findHeaderRow } from "./mapping-table.helpers";

const parseMapped = (
  mapping: FormatMapping,
  content: ExtractedContent,
): Result<ParsedStatement> => {
  const rows = firstSheetRows(content);
  if (rows === undefined) return parseFailed({ reason: "content_type" });
  const headerRow = findHeaderRow(rows, mapping.header);
  if (headerRow === undefined) {
    return parseFailed({ reason: "missing_block", block: "header" });
  }
  const table = readTable(rows, headerRow, mapping);
  return table.ok ? mappedStatement(mapping, table.value) : table;
};

/**
 * The parser of a spreadsheet no parser knows, from the mapping that says
 * how to read it (Stage 11): it recognizes the mapping's header, reads the
 * columns its roles name, and keeps only those when it minimizes. Its
 * statements belong to a savings account of the mapping's bank, which the
 * file doesn't name.
 */
export const mappingParser = (mapping: FormatMapping): BankParser => ({
  id: MAPPED_FORMAT_ID,
  bankId: mapping.bankId,
  accountType: ACCOUNT_TYPE.SAVINGS,
  identifiesAccount: false,
  canParse: (content) => {
    const rows = firstSheetRows(content);
    return (
      rows !== undefined && findHeaderRow(rows, mapping.header) !== undefined
    );
  },
  parse: (content) => parseMapped(mapping, content),
  minimize: (content) => minimizeMapped(mapping, content),
});
