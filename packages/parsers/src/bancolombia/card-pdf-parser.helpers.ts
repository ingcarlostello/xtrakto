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
import { BANCOLOMBIA_BANK_ID } from "./bancolombia.constants";
import {
  findCardPdfHeader,
  readCardPdfHeader,
} from "./card-pdf-header.helpers";
import { minimizeCardPdf } from "./card-pdf-minimize.helpers";
import {
  cardPdfPages,
  cardPdfTables,
  foreignCardPdfWarnings,
  readCardPdfMovements,
} from "./card-pdf-movements.helpers";
import { CARD_PDF_FORMAT_ID, CARD_PDF_LABEL } from "./card.constants";

const parse = (content: ExtractedContent): Result<ParsedStatement> => {
  if (content.type !== "pdf") return parseFailed({ reason: "content_type" });
  const pages = cardPdfPages(pdfLines(content));
  if (pages.pesos.length === 0) {
    return parseFailed({
      reason: "missing_block",
      block: CARD_PDF_LABEL.CURRENCY,
    });
  }
  const header = readCardPdfHeader(findCardPdfHeader(pages.pesos));
  if (!header.ok) return header;
  const movements = readCardPdfMovements(cardPdfTables(pages.pesos));
  if (!movements.ok) return movements;
  const foreign = foreignCardPdfWarnings(cardPdfTables(pages.dollars));
  if (!foreign.ok) return foreign;
  // Checks the bounds the content's type can't express, and the card's
  // figures on a card's statement.
  const statement = parsedStatementSchema.safeParse({
    bankId: BANCOLOMBIA_BANK_ID,
    formatId: CARD_PDF_FORMAT_ID,
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
 * Bancolombia's credit card statement as a PDF (Appendix A.4b), read from its
 * text's positions into the same statement its spreadsheet gives: its pages
 * in pesos read, its pages in dollars only counted.
 */
export const bancolombiaCardPdfParser: BankParser = {
  id: CARD_PDF_FORMAT_ID,
  bankId: BANCOLOMBIA_BANK_ID,
  accountType: ACCOUNT_TYPE.CREDIT_CARD,
  identifiesAccount: true,
  // Recognized by its pages in pesos and the card their first one names.
  canParse: (content) =>
    content.type === "pdf" &&
    findCardPdfHeader(cardPdfPages(pdfLines(content)).pesos).card !== undefined,
  parse,
  minimize: minimizeCardPdf,
};
