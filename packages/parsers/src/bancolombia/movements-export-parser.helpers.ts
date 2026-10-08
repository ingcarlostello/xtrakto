import {
  ACCOUNT_TYPE,
  CURRENCY,
  ok,
  PERIOD_SOURCE,
  parsedStatementSchema,
} from "@xtrakto/core";
import type { ExtractedContent, ParsedStatement, Result } from "@xtrakto/core";
import type { BankParser } from "../registry/bank-parser.types";
import { firstSheetRows } from "../sheets/sheet.utils";
import {
  BANCOLOMBIA_BANK_ID,
  MOVEMENTS_EXPORT_FORMAT_ID,
} from "./bancolombia.constants";
import {
  findExportColumns,
  readExportMovements,
} from "./movements-export.helpers";
import { parseFailed } from "./parse-failure.helpers";

const parse = (content: ExtractedContent): Result<ParsedStatement> => {
  const rows = firstSheetRows(content);
  if (rows === undefined) return parseFailed({ reason: "content_type" });
  const movements = readExportMovements(rows);
  if (!movements.ok) return movements;
  const transactions = movements.value;
  // The export prints no period: it spans the movements, oldest first.
  const [first] = transactions;
  const last = transactions.at(-1);
  if (first === undefined || last === undefined) {
    return parseFailed({ reason: "no_movements" });
  }
  // The export has no account number, type or balances: the user picks the
  // account at upload, and the MVP reads savings accounts only.
  const statement = parsedStatementSchema.safeParse({
    bankId: BANCOLOMBIA_BANK_ID,
    formatId: MOVEMENTS_EXPORT_FORMAT_ID,
    accountType: ACCOUNT_TYPE.SAVINGS,
    currency: CURRENCY.COP,
    period: { from: first.date, to: last.date },
    periodSource: PERIOD_SOURCE.ROWS,
    transactions,
    warnings: [],
  });
  return statement.success
    ? ok(statement.data)
    : parseFailed({ reason: "invalid_output" });
};

/** Bancolombia's movements export, "Descargar movimientos" (Appendix A.2). */
export const bancolombiaMovementsExportParser: BankParser = {
  id: MOVEMENTS_EXPORT_FORMAT_ID,
  bankId: BANCOLOMBIA_BANK_ID,
  // Recognized by its header row, found the same way `parse` finds it.
  canParse: (content) => {
    const rows = firstSheetRows(content);
    return rows !== undefined && findExportColumns(rows).ok;
  },
  parse,
};
