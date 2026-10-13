import { err, ok } from "@xtrakto/core";
import type { ParsedStatement, Result } from "@xtrakto/core";
import { extractSpreadsheet, findParser } from "@xtrakto/parsers";
import { fitsInUpload } from "./upload-size.helpers";
import { CONTENT_TOO_LARGE, EXTRACTION_STAGE } from "./upload.constants";
import type {
  ExtractedStatement,
  ExtractionStage,
  StatementPreview,
} from "./upload.types";

const toPreview = (statement: ParsedStatement): StatementPreview => ({
  bankId: statement.bankId,
  formatId: statement.formatId,
  accountType: statement.accountType,
  accountLast4: statement.accountLast4,
  period: statement.period,
  periodSource: statement.periodSource,
  movementCount: statement.transactions.length,
});

/**
 * Reads a statement file in the browser, reporting each stage as it starts:
 * extracts it, recognizes its format, keeps only what its parser reads
 * (ADR 0017) and parses that for the preview, so the preview shows what the
 * server will read. Content too large to send fails before the parse. The
 * result never holds the movements: only the content to send and a preview.
 */
export const extractStatement = (
  bytes: Uint8Array,
  onStage: (stage: ExtractionStage) => void,
): Result<ExtractedStatement> => {
  onStage(EXTRACTION_STAGE.READING);
  const extracted = extractSpreadsheet(bytes);
  if (!extracted.ok) return extracted;
  onStage(EXTRACTION_STAGE.RECOGNIZING);
  const parser = findParser(extracted.value);
  if (!parser.ok) return parser;
  onStage(EXTRACTION_STAGE.PREPARING);
  const content = parser.value.minimize(extracted.value);
  if (!fitsInUpload(content)) return err(CONTENT_TOO_LARGE);
  const statement = parser.value.parse(content);
  if (!statement.ok) return statement;
  return ok({ content, preview: toPreview(statement.value) });
};
