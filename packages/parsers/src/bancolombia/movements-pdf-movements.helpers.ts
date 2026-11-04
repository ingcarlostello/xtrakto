import {
  ok,
  PARSE_WARNING_CODE,
  parsePesoAmountText,
  parseShortMonthDate,
} from "@xtrakto/core";
import type {
  ParsedStatement,
  ParseWarning,
  Result,
  SpreadsheetCell,
} from "@xtrakto/core";
import type { PdfTableRow } from "../pdf-layout/pdf-layout.types";
import { cellText, comparableText, hasText } from "../sheets/sheet.utils";
import {
  EXPORT_COLUMN,
  MOVEMENTS_PDF_COLUMNS,
  MOVEMENTS_PDF_FOOTER,
} from "./bancolombia.constants";
import { fromText, readExportMovements } from "./movements-export.helpers";
import type { MovementCellReaders } from "./movements-export.helpers";

type Cells = readonly SpreadsheetCell[];

/** What the PDF's movements table gives: its movements, and what was joined. */
export type MovementsPdfMovements = Pick<
  ParsedStatement,
  "transactions" | "warnings"
>;

const DESCRIPTION = MOVEMENTS_PDF_COLUMNS.indexOf(EXPORT_COLUMN.DESCRIPTION);

// The PDF prints dates and amounts as text: "3 sep 2026", "-$ 45.900,00".
const PDF_READERS: MovementCellReaders = {
  date: fromText(parseShortMonthDate),
  amount: fromText(parsePesoAmountText),
};

/**
 * Whether a line's text is what each page prints under its table, the IP
 * address the file was downloaded from, by what it says.
 */
export const isMovementsPdfFooter = (text: string): boolean =>
  comparableText(text).startsWith(comparableText(MOVEMENTS_PDF_FOOTER));

const isFooterRow = (cells: Cells): boolean => {
  const first = cells.map(cellText).find((text) => text !== undefined);
  return first !== undefined && isMovementsPdfFooter(first);
};

const isTitleRow = (cells: Cells): boolean =>
  MOVEMENTS_PDF_COLUMNS.every((name, index) => hasText(cells[index], name));

const wrappedDescriptions = (rows: readonly PdfTableRow[]): ParseWarning[] =>
  rows.flatMap(({ wrapped }, sourceRow) =>
    wrapped.includes(DESCRIPTION)
      ? [{ code: PARSE_WARNING_CODE.WRAPPED_DESCRIPTION, sourceRow }]
      : [],
  );

/**
 * Reads the movements of a movements export's PDF from its table's rows, as
 * the spreadsheet's are read, under the first page's titles and oldest first.
 * The pages' footers and the titles each later page repeats are left out
 * first, so each movement's row is the same whether the footers were sent or
 * not. Each description the PDF wrapped over two lines gives a warning.
 */
export const readMovementsPdfRows = (
  rows: readonly PdfTableRow[],
): Result<MovementsPdfMovements> => {
  const table = rows.filter(
    ({ cells }, index) =>
      !isFooterRow(cells) && (index === 0 || !isTitleRow(cells)),
  );
  const transactions = readExportMovements(
    table.map(({ cells }) => cells),
    PDF_READERS,
  );
  if (!transactions.ok) return transactions;
  return ok({
    transactions: transactions.value,
    warnings: wrappedDescriptions(table),
  });
};
