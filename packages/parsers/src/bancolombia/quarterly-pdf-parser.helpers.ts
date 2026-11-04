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
  QUARTERLY_PDF_COLUMNS,
  QUARTERLY_PDF_FORMAT_ID,
} from "./bancolombia.constants";
import { parseFailed } from "./parse-failure.helpers";
import {
  findQuarterlyPdfHeader,
  readQuarterlyPdfHeader,
} from "./quarterly-pdf-header.helpers";
import { minimizeQuarterlyPdf } from "./quarterly-pdf-minimize.helpers";
import { readQuarterlyPdfMovements } from "./quarterly-pdf-movements.helpers";

const LAYOUT = { columns: QUARTERLY_PDF_COLUMNS };

const parse = (content: ExtractedContent): Result<ParsedStatement> => {
  if (content.type !== "pdf") return parseFailed({ reason: "content_type" });
  const lines = pdfLines(content);
  const tables = pdfTables(lines, QUARTERLY_PDF_COLUMNS);
  const header = readQuarterlyPdfHeader(
    findQuarterlyPdfHeader(linesAboveTable(lines, tables)),
  );
  if (!header.ok) return header;
  const movements = readQuarterlyPdfMovements(
    pdfTableRows(lines, LAYOUT).map(({ cells }) => cells),
    header.value.period,
  );
  if (!movements.ok) return movements;
  const statement = parsedStatementSchema.safeParse({
    bankId: BANCOLOMBIA_BANK_ID,
    formatId: QUARTERLY_PDF_FORMAT_ID,
    currency: CURRENCY.COP,
    periodSource: PERIOD_SOURCE.STATEMENT,
    ...header.value,
    ...movements.value,
  });
  return statement.success
    ? ok(statement.data)
    : parseFailed({ reason: "invalid_output" });
};

/**
 * Bancolombia's quarterly savings account statement as a PDF (Appendix A.3),
 * read from its text's positions into the same statement its spreadsheet
 * gives.
 */
export const bancolombiaQuarterlyPdfParser: BankParser = {
  id: QUARTERLY_PDF_FORMAT_ID,
  bankId: BANCOLOMBIA_BANK_ID,
  // The header box's account type must say CUENTA DE AHORROS.
  accountType: ACCOUNT_TYPE.SAVINGS,
  identifiesAccount: true,
  // Recognized by its movements table's titles, found as `parse` finds them.
  canParse: (content) =>
    content.type === "pdf" &&
    pdfTables(pdfLines(content), QUARTERLY_PDF_COLUMNS).length > 0,
  parse,
  minimize: minimizeQuarterlyPdf,
};
