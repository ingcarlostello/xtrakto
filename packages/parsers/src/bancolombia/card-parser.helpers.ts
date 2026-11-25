import {
  ACCOUNT_TYPE,
  CURRENCY,
  ok,
  PERIOD_SOURCE,
  parsedStatementSchema,
} from "@xtrakto/core";
import type { ExtractedContent, ParsedStatement, Result } from "@xtrakto/core";
import { parseFailed } from "../registry/parse-failure.helpers";
import type { BankParser } from "../registry/bank-parser.types";
import { findLabelRow } from "../sheets/sheet.utils";
import { BANCOLOMBIA_BANK_ID } from "./bancolombia.constants";
import { cardSheets, readCardHeader } from "./card-header.helpers";
import { minimizeCard } from "./card-minimize.helpers";
import {
  foreignMovementWarnings,
  readCardMovements,
} from "./card-movements.helpers";
import { CARD_FORMAT_ID, CARD_LABEL } from "./card.constants";

const parse = (content: ExtractedContent): Result<ParsedStatement> => {
  const sheets = cardSheets(content);
  if (sheets === undefined) return parseFailed({ reason: "content_type" });
  if (sheets.pesos === undefined) {
    return parseFailed({ reason: "missing_block", block: CARD_LABEL.CURRENCY });
  }
  const header = readCardHeader(sheets.pesos);
  if (!header.ok) return header;
  const movements = readCardMovements(sheets.pesos);
  if (!movements.ok) return movements;
  const foreign = foreignMovementWarnings(sheets.dollars ?? []);
  if (!foreign.ok) return foreign;
  // Checks the bounds the content's type can't express, and the card's
  // figures on a card's statement.
  const statement = parsedStatementSchema.safeParse({
    bankId: BANCOLOMBIA_BANK_ID,
    formatId: CARD_FORMAT_ID,
    accountType: ACCOUNT_TYPE.CREDIT_CARD,
    currency: CURRENCY.COP,
    periodSource: PERIOD_SOURCE.STATEMENT,
    ...header.value,
    transactions: movements.value.transactions,
    warnings: [...movements.value.warnings, ...foreign.value],
  });
  return statement.success
    ? ok(statement.data)
    : parseFailed({ reason: "invalid_output" });
};

/**
 * Bancolombia's credit card statement in Excel (Appendix A.4): its sheet in
 * pesos read, its sheet in dollars only counted (12.2b).
 */
export const bancolombiaCardParser: BankParser = {
  id: CARD_FORMAT_ID,
  bankId: BANCOLOMBIA_BANK_ID,
  accountType: ACCOUNT_TYPE.CREDIT_CARD,
  identifiesAccount: true,
  // Recognized by its sheet in pesos and the card it names.
  canParse: (content) => {
    const pesos = cardSheets(content)?.pesos;
    return (
      pesos !== undefined && findLabelRow(pesos, CARD_LABEL.CARD) !== undefined
    );
  },
  parse,
  minimize: minimizeCard,
};
