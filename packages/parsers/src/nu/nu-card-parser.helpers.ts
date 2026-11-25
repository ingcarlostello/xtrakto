import {
  ACCOUNT_TYPE,
  CURRENCY,
  ok,
  PERIOD_SOURCE,
  parsedStatementSchema,
} from "@xtrakto/core";
import type { ExtractedContent, ParsedStatement, Result } from "@xtrakto/core";
import { pdfLines } from "../pdf-layout/pdf-lines.helpers";
import type { BankParser } from "../registry/bank-parser.types";
import { parseFailed } from "../registry/parse-failure.helpers";
import { findNuCardHeader, readNuCardHeader } from "./nu-card-header.helpers";
import { minimizeNuCard } from "./nu-card-minimize.helpers";
import { readNuCardMovements } from "./nu-card-movements.helpers";
import { nuTable } from "./nu-card-table.helpers";
import { NU_BANK_ID, NU_CARD_FORMAT_ID } from "./nu.constants";

const parse = (content: ExtractedContent): Result<ParsedStatement> => {
  if (content.type !== "pdf") return parseFailed({ reason: "content_type" });
  const lines = pdfLines(content);
  const header = readNuCardHeader(findNuCardHeader(lines));
  if (!header.ok) return header;
  const movements = readNuCardMovements(nuTable(lines), header.value.period);
  if (!movements.ok) return movements;
  // Checks the bounds the content's type can't express, and the card's
  // figures on a card's statement.
  const statement = parsedStatementSchema.safeParse({
    bankId: NU_BANK_ID,
    formatId: NU_CARD_FORMAT_ID,
    accountType: ACCOUNT_TYPE.CREDIT_CARD,
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
 * Nu's credit card statement, a PDF from its app (Appendix A.5), read from its
 * text's positions: one account for the physical and the virtual card, which
 * share their limit, by the physical one's last 4 digits. Not in the default
 * registry until the app saves a card's statement (12.3a).
 */
export const nuCardPdfParser: BankParser = {
  id: NU_CARD_FORMAT_ID,
  bankId: NU_BANK_ID,
  accountType: ACCOUNT_TYPE.CREDIT_CARD,
  identifiesAccount: true,
  // Recognized by the physical card its first page names.
  canParse: (content) =>
    content.type === "pdf" &&
    findNuCardHeader(pdfLines(content)).card !== undefined,
  parse,
  minimize: minimizeNuCard,
};
