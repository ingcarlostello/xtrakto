import { err, ok, PARSE_WARNING_CODE } from "@xtrakto/core";
import type {
  ColumnRole,
  ExtractedContent,
  FormatMapping,
  ParsedStatement,
  Result,
} from "@xtrakto/core";
import {
  type BankParser,
  extractPdf,
  extractSpreadsheet,
  findParser,
  findTable,
  formatSample,
  isPdf,
  mappingFromRoles,
  mappingParser,
  reviewMapping,
} from "@xtrakto/parsers";
import type { MappingProposal } from "@/features/format-mappings/format-mapping.types";
import { fitsInUpload } from "./upload-size.helpers";
import { CONTENT_TOO_LARGE, EXTRACTION_STAGE } from "./upload.constants";
import type {
  ExtractedStatement,
  ExtractionStage,
  FileReading,
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

// Keeps only what the parser reads (ADR 0017) and parses that for the
// preview, so the preview shows what the server will read. Content too large
// to send fails before the parse.
const readWith = (
  parser: BankParser,
  extracted: ExtractedContent,
): Result<ExtractedStatement> => {
  const content = parser.minimize(extracted);
  if (!fitsInUpload(content)) return err(CONTENT_TOO_LARGE);
  const statement = parser.parse(content);
  if (!statement.ok) return statement;
  const pdf = pdfReading(extracted, statement.value);
  return ok({ content, preview: toPreview(statement.value, pdf) });
};

// A spreadsheet no parser knows, when it holds a table: its header's names
// and its sample, for its format to be found or proposed (Stage 11).
const unknownFormat = (
  content: ExtractedContent,
  unknown: Result<never>,
): Result<FileReading> => {
  const table = findTable(content);
  const sample = formatSample(content);
  if (!table.ok || !sample.ok) return unknown;
  const format = { header: table.value.header, sample: sample.value };
  return ok({ kind: "unknown", content, format });
};

/**
 * Reads a statement file in the browser, reporting each stage as it starts:
 * extracts it (an Excel file, or a PDF with its password when it has one)
 * and recognizes its format, then keeps only what its parser reads and
 * parses that for the preview. The statement never holds the movements:
 * only the content to send and a preview. A spreadsheet no parser knows but
 * with a table comes back whole, with what's asked about its format.
 */
export const extractStatement = async (
  bytes: Uint8Array,
  { onStage, password }: ExtractionOptions,
): Promise<Result<FileReading>> => {
  onStage(EXTRACTION_STAGE.READING);
  const extracted = await extractContent(bytes, password);
  if (!extracted.ok) return extracted;
  onStage(EXTRACTION_STAGE.RECOGNIZING);
  const parser = findParser(extracted.value);
  if (!parser.ok) return unknownFormat(extracted.value, parser);
  onStage(EXTRACTION_STAGE.PREPARING);
  const statement = readWith(parser.value, extracted.value);
  return statement.ok
    ? ok({ kind: "statement", statement: statement.value })
    : statement;
};

/** A file no parser knows, read with a mapping as any format is (Stage 11). */
export const readWithMapping = (
  content: ExtractedContent,
  mapping: FormatMapping,
): Result<ExtractedStatement> => readWith(mappingParser(mapping), content);

/**
 * What the roles the LLM proposed make of a file no parser knows (11.3a):
 * the mapping, with the formats its cells write, and how the file reads with
 * it, for the person to confirm. Fails when the roles read no table or the
 * mapping doesn't read the file.
 */
export const proposeReading = (
  content: ExtractedContent,
  roles: readonly ColumnRole[],
): Result<MappingProposal> => {
  const mapping = mappingFromRoles(content, roles);
  if (!mapping.ok) return mapping;
  const review = reviewMapping(content, mapping.value);
  return review.ok
    ? ok({ mapping: mapping.value, review: review.value })
    : review;
};
