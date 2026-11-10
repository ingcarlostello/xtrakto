import {
  ACCOUNT_TYPE,
  CURRENCY,
  ok,
  PERIOD_SOURCE,
  parsedStatementSchema,
} from "@xtrakto/core";
import type { ExtractedContent, ParsedStatement, Result } from "@xtrakto/core";
import { pdfLines } from "../pdf-layout/pdf-lines.helpers";
import {
  linesAboveTable,
  pdfTableRows,
  pdfTables,
} from "../pdf-layout/pdf-table.helpers";
import type { BankParser } from "../registry/bank-parser.types";
import {
  BANCOLOMBIA_BANK_ID,
  EXPORT_COLUMN,
  MOVEMENTS_PDF_COLUMNS,
  MOVEMENTS_PDF_FORMAT_ID,
} from "./bancolombia.constants";
import {
  findMovementsPdfHeader,
  readMovementsPdfHeader,
} from "./movements-pdf-header.helpers";
import { minimizeMovementsPdf } from "./movements-pdf-minimize.helpers";
import { readMovementsPdfRows } from "./movements-pdf-movements.helpers";
import { parseFailed } from "../registry/parse-failure.helpers";

// Every row fills its date; a description or a reference wraps under it.
const LAYOUT = { columns: MOVEMENTS_PDF_COLUMNS, anchor: EXPORT_COLUMN.DATE };

const parse = (content: ExtractedContent): Result<ParsedStatement> => {
  if (content.type !== "pdf") return parseFailed({ reason: "content_type" });
  const lines = pdfLines(content);
  const tables = pdfTables(lines, MOVEMENTS_PDF_COLUMNS);
  const header = readMovementsPdfHeader(
    findMovementsPdfHeader(linesAboveTable(lines, tables)),
  );
  if (!header.ok) return header;
  const movements = readMovementsPdfRows(pdfTableRows(lines, LAYOUT));
  if (!movements.ok) return movements;
  const { transactions, warnings } = movements.value;
  // As its spreadsheet, the PDF prints no period: it spans the movements.
  const [first] = transactions;
  const last = transactions.at(-1);
  if (first === undefined || last === undefined) {
    return parseFailed({ reason: "no_movements" });
  }
  const statement = parsedStatementSchema.safeParse({
    bankId: BANCOLOMBIA_BANK_ID,
    formatId: MOVEMENTS_PDF_FORMAT_ID,
    currency: CURRENCY.COP,
    period: { from: first.date, to: last.date },
    periodSource: PERIOD_SOURCE.ROWS,
    ...header.value,
    transactions,
    warnings,
  });
  return statement.success
    ? ok(statement.data)
    : parseFailed({ reason: "invalid_output" });
};

/**
 * Bancolombia's movements export as a PDF (Appendix A.2b), read from its
 * text's positions into the movements its spreadsheet gives. Unlike the
 * spreadsheet, it names its account and holder, but prints no balances.
 */
export const bancolombiaMovementsPdfParser: BankParser = {
  id: MOVEMENTS_PDF_FORMAT_ID,
  bankId: BANCOLOMBIA_BANK_ID,
  // The header's account type must say Cuenta de Ahorros.
  accountType: ACCOUNT_TYPE.SAVINGS,
  identifiesAccount: true,
  // Recognized by its movements table's titles, found as `parse` finds them.
  canParse: (content) =>
    content.type === "pdf" &&
    pdfTables(pdfLines(content), MOVEMENTS_PDF_COLUMNS).length > 0,
  parse,
  minimize: minimizeMovementsPdf,
};
