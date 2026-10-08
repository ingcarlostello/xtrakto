import {
  CURRENCY,
  ok,
  PERIOD_SOURCE,
  parsedStatementSchema,
} from "@xtrakto/core";
import type { ExtractedContent, ParsedStatement, Result } from "@xtrakto/core";
import type { BankParser } from "../registry/bank-parser.types";
import type { SheetRows } from "../sheets/sheet.utils";
import {
  BANCOLOMBIA_BANK_ID,
  QUARTERLY_FORMAT_ID,
} from "./bancolombia.constants";
import { parseFailed } from "./quarterly-failure.helpers";
import { readQuarterlyHeader } from "./quarterly-header.helpers";
import {
  findMovementsTable,
  readQuarterlyMovements,
} from "./quarterly-movements.helpers";

// The statement is the first sheet of a spreadsheet; its name varies.
const firstSheetRows = (content: ExtractedContent): SheetRows | undefined =>
  content.type === "spreadsheet" ? (content.sheets[0]?.rows ?? []) : undefined;

const parse = (content: ExtractedContent): Result<ParsedStatement> => {
  const rows = firstSheetRows(content);
  if (rows === undefined) return parseFailed({ reason: "content_type" });
  const header = readQuarterlyHeader(rows);
  if (!header.ok) return header;
  const movements = readQuarterlyMovements(rows, header.value.period);
  if (!movements.ok) return movements;
  // Checks the bounds the content's type can't express, such as a
  // description longer than a cell may be.
  const statement = parsedStatementSchema.safeParse({
    bankId: BANCOLOMBIA_BANK_ID,
    formatId: QUARTERLY_FORMAT_ID,
    currency: CURRENCY.COP,
    periodSource: PERIOD_SOURCE.STATEMENT,
    ...header.value,
    ...movements.value,
  });
  return statement.success
    ? ok(statement.data)
    : parseFailed({ reason: "invalid_output" });
};

/** Bancolombia's quarterly savings account statement (Appendix A.1). */
export const bancolombiaQuarterlyParser: BankParser = {
  id: QUARTERLY_FORMAT_ID,
  bankId: BANCOLOMBIA_BANK_ID,
  // Recognized by its movements table, found the same way `parse` finds it.
  canParse: (content) => {
    const rows = firstSheetRows(content);
    return rows !== undefined && findMovementsTable(rows).ok;
  },
  parse,
};
