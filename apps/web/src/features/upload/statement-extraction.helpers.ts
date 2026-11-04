import { err, ok, PARSE_WARNING_CODE } from "@xtrakto/core";
import type { ExtractedContent, ParsedStatement, Result } from "@xtrakto/core";
import {
  extractPdf,
  extractSpreadsheet,
  findParser,
  isPdf,
} from "@xtrakto/parsers";
import { fitsInUpload } from "./upload-size.helpers";
import { CONTENT_TOO_LARGE, EXTRACTION_STAGE } from "./upload.constants";
import type {
  ExtractedStatement,
  ExtractionStage,
  PdfReading,
  StatementPreview,
} from "./upload.types";

/** How a file is read: the stage it reaches, and a PDF's password if any. */
export type ExtractionOptions = {
  readonly onStage: (stage: ExtractionStage) => void;
  /** Opens an encrypted PDF; it goes nowhere else. */
  readonly password?: string;
};

// A PDF's pages, as the file has them, and the descriptions its parser joined
// from two lines (docs/ui/v8-08).
const pdfReading = (
  extracted: ExtractedContent,
  { warnings }: ParsedStatement,
): PdfReading | undefined =>
  extracted.type === "pdf"
    ? {
        pageCount: extracted.pages.length,
        joinedDescriptions: warnings.filter(
          ({ code }) => code === PARSE_WARNING_CODE.WRAPPED_DESCRIPTION,
        ).length,
      }
    : undefined;

const toPreview = (
  statement: ParsedStatement,
  pdf: PdfReading | undefined,
): StatementPreview => ({
  bankId: statement.bankId,
  formatId: statement.formatId,
  accountType: statement.accountType,
  accountLast4: statement.accountLast4,
  period: statement.period,
  periodSource: statement.periodSource,
  movementCount: statement.transactions.length,
  pdf,
});

// A PDF by its first bytes, whatever its name says; anything else is read as
// a spreadsheet. pdf.js downloads only with the first PDF.
const extractContent = (
  bytes: Uint8Array,
  password: string | undefined,
): Promise<Result<ExtractedContent>> =>
  isPdf(bytes)
    ? extractPdf(bytes, { password })
    : Promise.resolve(extractSpreadsheet(bytes));

/**
 * Reads a statement file in the browser, reporting each stage as it starts:
 * extracts it (an Excel file, or a PDF with its password when it has one),
 * recognizes its format, keeps only what its parser reads (ADR 0017) and
 * parses that for the preview, so the preview shows what the server will
 * read. Content too large to send fails before the parse. The result never
 * holds the movements: only the content to send and a preview.
 */
export const extractStatement = async (
  bytes: Uint8Array,
  { onStage, password }: ExtractionOptions,
): Promise<Result<ExtractedStatement>> => {
  onStage(EXTRACTION_STAGE.READING);
  const extracted = await extractContent(bytes, password);
  if (!extracted.ok) return extracted;
  onStage(EXTRACTION_STAGE.RECOGNIZING);
  const parser = findParser(extracted.value);
  if (!parser.ok) return parser;
  onStage(EXTRACTION_STAGE.PREPARING);
  const content = parser.value.minimize(extracted.value);
  if (!fitsInUpload(content)) return err(CONTENT_TOO_LARGE);
  const statement = parser.value.parse(content);
  if (!statement.ok) return statement;
  const pdf = pdfReading(extracted.value, statement.value);
  return ok({ content, preview: toPreview(statement.value, pdf) });
};
