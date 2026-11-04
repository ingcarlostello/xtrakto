import { describe, expect, it } from "vitest";
import type {
  ExtractedContent,
  ParsedStatement,
  ParsedTransaction,
  PdfContent,
  PdfTextItem,
} from "@xtrakto/core";
import {
  readPrivateExports,
  readPrivatePdfs,
} from "../../fixtures/private-exports.mjs";
import { extractPdf } from "../extraction/pdf-extraction.helpers";
import { extractSpreadsheet } from "../extraction/spreadsheet-extraction.helpers";
import { pdfLines } from "../pdf-layout/pdf-lines.helpers";
import { linesAboveTable, pdfTables } from "../pdf-layout/pdf-table.helpers";
import { reconcile } from "../reconciliation/reconciliation.helpers";
import { findParser } from "../registry/default-registry.helpers";
import {
  QUARTERLY_FORMAT_ID,
  QUARTERLY_PDF_COLUMNS,
  QUARTERLY_PDF_FORMAT_ID,
} from "./bancolombia.constants";
import { findQuarterlyPdfHeader } from "./quarterly-pdf-header.helpers";
import { isPageFooter } from "./quarterly-pdf-movements.helpers";

// The human's real quarterly statements as PDFs, in the git-ignored
// fixtures/private/ (Phase 9.3), each against its spreadsheet. Assertions
// compare counts only, so a failure never prints a description, an amount,
// a name or a file name.

type Read = {
  readonly content: ExtractedContent;
  readonly statement?: ParsedStatement;
};

const read = (content: ExtractedContent): Read => {
  const parser = findParser(content);
  const statement = parser.ok ? parser.value.parse(content) : undefined;
  return { content, statement: statement?.ok ? statement.value : undefined };
};

const pdfs = (
  await Promise.all((await readPrivatePdfs()).map((bytes) => extractPdf(bytes)))
)
  .flatMap((result) => (result.ok ? [read(result.value)] : []))
  .filter(({ statement }) => statement?.formatId === QUARTERLY_PDF_FORMAT_ID);

const spreadsheets = (await readPrivateExports())
  .map((bytes) => extractSpreadsheet(bytes))
  .flatMap((result) => (result.ok ? [read(result.value)] : []))
  .flatMap(({ statement }) =>
    statement?.formatId === QUARTERLY_FORMAT_ID ? [statement] : [],
  );

const twinOf = (statement: ParsedStatement) =>
  spreadsheets.find(
    (candidate) =>
      candidate.accountLast4 === statement.accountLast4 &&
      candidate.period.from === statement.period.from &&
      candidate.period.to === statement.period.to,
  );

const json = (value: unknown) => JSON.stringify(value);

const comparableMovement = (transaction: ParsedTransaction) => ({
  ...transaction,
  descriptionRaw: transaction.descriptionRaw.replace(/ {2,}/g, " "),
  sourceRow: 0,
});

// How many of a statement's fields differ from its twin's, every one but its
// format, where each movement sits, and the second of two spaces in a row in
// a description, which the PDF prints as one.
const differences = (pdf: ParsedStatement, twin: ParsedStatement) => {
  const header = (
    [
      "holderName",
      "period",
      "accountLast4",
      "openingBalanceMinor",
      "closingBalanceMinor",
      "totals",
    ] as const
  ).filter((field) => json(pdf[field]) !== json(twin[field])).length;
  const movements = pdf.transactions.filter((transaction, index) => {
    const other = twin.transactions[index];
    return (
      other === undefined ||
      json(comparableMovement(transaction)) !== json(comparableMovement(other))
    );
  }).length;
  return {
    header,
    movements,
    count: pdf.transactions.length - twin.transactions.length,
  };
};

const pdfOf = (content: ExtractedContent): PdfContent => {
  if (content.type !== "pdf") throw new Error("Not a PDF.");
  return content;
};

// The first page's address and city, under the holder, left of the header
// box; and every later page's header, above its table.
const personalItems = (content: PdfContent): Set<PdfTextItem> => {
  const lines = pdfLines(content);
  const tables = pdfTables(lines, QUARTERLY_PDF_COLUMNS);
  const headerLines = linesAboveTable(lines, tables);
  const boxLeft =
    findQuarterlyPdfHeader(headerLines).from?.segments[0]?.left ?? 0;
  const leftBlock = headerLines
    .flatMap(({ segments }) => segments)
    .filter(({ right }) => right < boxLeft)
    .slice(1, 3);
  const titleLineOf = new Map(
    tables.map(({ page, header }) => [
      page,
      lines.findIndex(({ segments }) =>
        segments.some((segment) => header.includes(segment)),
      ),
    ]),
  );
  const laterHeaders = lines.filter(
    ({ page }, index) => page > 0 && index < (titleLineOf.get(page) ?? -1),
  );
  return new Set(
    [...leftBlock, ...laterHeaders.flatMap(({ segments }) => segments)].flatMap(
      ({ items }) => items,
    ),
  );
};

describe.skipIf(pdfs.length === 0)("real quarterly statements in PDF", () => {
  it("reads each as its spreadsheet twin, and reconciles it", () => {
    for (const { statement } of pdfs) {
      if (statement === undefined) continue;
      const twin = twinOf(statement);

      expect(twin === undefined).toBe(false);
      if (twin !== undefined) {
        expect(differences(statement, twin)).toEqual({
          header: 0,
          movements: 0,
          count: 0,
        });
      }
      expect(reconcile(statement).balanceVerified).toBe(true);
    }
  });

  it("reads each the same once minimized, which sends nothing personal", () => {
    for (const { content, statement } of pdfs) {
      const parser = findParser(content);
      if (!parser.ok) continue;
      const minimized = pdfOf(parser.value.minimize(content));
      const sent = minimized.pages.flatMap(({ items }) => items);
      const personal = personalItems(pdfOf(content));

      expect(json(read(minimized).statement) === json(statement)).toBe(true);
      expect({
        personal: sent.filter((item) => personal.has(item)).length,
        longNumbers: sent.filter(({ str }) => /\d{6,}/.test(str)).length,
        footers: sent.filter(({ str }) => isPageFooter(str)).length,
      }).toEqual({ personal: 0, longNumbers: 0, footers: 0 });
    }
  });
});
