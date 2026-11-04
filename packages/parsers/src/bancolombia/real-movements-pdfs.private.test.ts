import { describe, expect, it } from "vitest";
import { normalizeHolderName } from "@xtrakto/core";
import type {
  ExtractedContent,
  ParsedStatement,
  ParsedTransaction,
  PdfContent,
  PdfTextItem,
  Period,
} from "@xtrakto/core";
import {
  readPrivateExports,
  readPrivatePdfs,
} from "../../fixtures/private-exports.mjs";
import { extractPdf } from "../extraction/pdf-extraction.helpers";
import { extractSpreadsheet } from "../extraction/spreadsheet-extraction.helpers";
import { pdfLines } from "../pdf-layout/pdf-lines.helpers";
import { linesAboveTable, pdfTables } from "../pdf-layout/pdf-table.helpers";
import { findParser } from "../registry/default-registry.helpers";
import {
  EXPORT_COLUMN,
  MOVEMENTS_EXPORT_FORMAT_ID,
  MOVEMENTS_PDF_COLUMNS,
  MOVEMENTS_PDF_FORMAT_ID,
  QUARTERLY_FORMAT_ID,
} from "./bancolombia.constants";
import { findMovementsPdfHeader } from "./movements-pdf-header.helpers";
import { isMovementsPdfFooter } from "./movements-pdf-movements.helpers";

// The human's real movements exports as PDFs, in the git-ignored
// fixtures/private/ (Phase 9.3b), each against its spreadsheet. Assertions
// compare counts only, so a failure never prints a description, an amount,
// a reference, a name or a file name.

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
  .filter(({ statement }) => statement?.formatId === MOVEMENTS_PDF_FORMAT_ID);

const spreadsheets = (await readPrivateExports())
  .map((bytes) => extractSpreadsheet(bytes))
  .flatMap((result) => (result.ok ? [read(result.value)] : []))
  .flatMap(({ statement }) => (statement === undefined ? [] : [statement]));

const ofFormat = (formatId: string) =>
  spreadsheets.filter((statement) => statement.formatId === formatId);

// The days two statements both cover, which may be none.
const sharedDays = (a: ParsedStatement, b: ParsedStatement): Period => ({
  from: a.period.from > b.period.from ? a.period.from : b.period.from,
  to: a.period.to < b.period.to ? a.period.to : b.period.to,
});

const onDays = (statement: ParsedStatement, { from, to }: Period) =>
  statement.transactions.filter(({ date }) => date >= from && date <= to);

// Its spreadsheet: the one of the same download, or, when the human
// downloaded each for a different range, the one sharing the most movements
// with it on the days both cover.
const twinOf = (pdf: ParsedStatement) =>
  ofFormat(MOVEMENTS_EXPORT_FORMAT_ID)
    .map((spreadsheet) => ({ spreadsheet, days: sharedDays(pdf, spreadsheet) }))
    .toSorted(
      (a, b) =>
        onDays(b.spreadsheet, b.days).length -
        onDays(a.spreadsheet, a.days).length,
    )[0];

const FIELDS = [
  "date",
  "descriptionRaw",
  "descriptionNormalized",
  "amountMinor",
  "referenceRaw",
  "referenceKind",
] as const;

const json = (value: unknown) => JSON.stringify(value);

// Four groups of up to three digits, as no amount ends: "-$ 1.234.567.890,00".
const IP_ADDRESS = /(?:^|\s)\d{1,3}(?:\.\d{1,3}){3}(?:\s|$)/;

// A movement without where it sits, nor the second of two spaces in a row in
// its description, which the PDF prints as one.
const comparable = (transaction: ParsedTransaction) => ({
  ...transaction,
  descriptionRaw: transaction.descriptionRaw.replace(/ {2,}/g, " "),
});

// How many of the PDF's movements its twin's days leave out, and how many on
// them differ from the twin's, field by field.
const differences = (pdf: ParsedStatement, twin: ParsedStatement) => {
  const days = sharedDays(pdf, twin);
  const mine = onDays(pdf, days).map(comparable);
  const theirs = onDays(twin, days).map(comparable);
  return {
    uncovered: pdf.transactions.length - mine.length,
    count: mine.length - theirs.length,
    ...Object.fromEntries(
      FIELDS.map((field) => [
        field,
        mine.filter(
          (transaction, index) =>
            json(transaction[field]) !== json(theirs[index]?.[field]),
        ).length,
      ]),
    ),
  };
};

const noDifferences = {
  uncovered: 0,
  count: 0,
  ...Object.fromEntries(FIELDS.map((field) => [field, 0])),
};

// The account and holder a quarterly statement of the human's names.
const namesAQuarterlyAccount = ({
  accountLast4,
  holderName,
}: ParsedStatement) =>
  ofFormat(QUARTERLY_FORMAT_ID).some(
    (quarterly) =>
      quarterly.accountLast4 === accountLast4 &&
      normalizeHolderName(quarterly.holderName ?? "") ===
        normalizeHolderName(holderName ?? ""),
  );

const pdfOf = (content: ExtractedContent): PdfContent => {
  if (content.type !== "pdf") throw new Error("Not a PDF.");
  return content;
};

// What the first page prints above its table but the holder's name and the
// account's type: the page's titles, the date and time it was downloaded.
const headerItems = (content: PdfContent): Set<PdfTextItem> => {
  const lines = pdfLines(content);
  const above = linesAboveTable(lines, pdfTables(lines, MOVEMENTS_PDF_COLUMNS));
  const { holder, type } = findMovementsPdfHeader(above);
  return new Set(
    above
      .flatMap(({ segments }) => segments)
      .filter((segment) => segment !== holder && segment !== type)
      .flatMap(({ items }) => items),
  );
};

// The items of the references, which are sent whole.
const referenceItems = (content: PdfContent): Set<PdfTextItem> => {
  const reference = MOVEMENTS_PDF_COLUMNS.indexOf(EXPORT_COLUMN.REFERENCE);
  return new Set(
    pdfTables(pdfLines(content), MOVEMENTS_PDF_COLUMNS).flatMap(({ lines }) =>
      lines.flatMap(({ line, columns }) =>
        line.segments
          .filter((_segment, index) => columns[index] === reference)
          .flatMap(({ items }) => items),
      ),
    ),
  );
};

describe.skipIf(pdfs.length === 0)("real movements exports in PDF", () => {
  it("reads each as its spreadsheet twin, naming the account and holder of a quarterly statement", () => {
    for (const { statement } of pdfs) {
      if (statement === undefined) continue;
      const twin = twinOf(statement)?.spreadsheet;

      expect(twin === undefined).toBe(false);
      if (twin !== undefined) {
        expect(differences(statement, twin)).toEqual(noDifferences);
      }
      expect(namesAQuarterlyAccount(statement)).toBe(true);
    }
  });

  it("reads each the same once minimized, which sends nothing personal", () => {
    for (const { content, statement } of pdfs) {
      const parser = findParser(content);
      if (!parser.ok) continue;
      const minimized = pdfOf(parser.value.minimize(content));
      const sent = minimized.pages.flatMap(({ items }) => items);
      const header = headerItems(pdfOf(content));
      const references = referenceItems(minimized);

      expect(json(read(minimized).statement) === json(statement)).toBe(true);
      expect({
        header: sent.filter((item) => header.has(item)).length,
        footers: sent.filter(({ str }) => isMovementsPdfFooter(str)).length,
        addresses: sent.filter(({ str }) => IP_ADDRESS.test(str)).length,
        longNumbers: sent.filter(
          (item) => !references.has(item) && /\d{6,}/.test(item.str),
        ).length,
      }).toEqual({ header: 0, footers: 0, addresses: 0, longNumbers: 0 });
    }
  });
});
