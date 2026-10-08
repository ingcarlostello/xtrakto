import type { z } from "zod";
import type {
  extractedContentSchema,
  pdfContentSchema,
  pdfTextItemSchema,
  spreadsheetCellSchema,
  spreadsheetContentSchema,
} from "./extracted-content.schemas";

export type ExtractedContent = z.infer<typeof extractedContentSchema>;
export type SpreadsheetContent = z.infer<typeof spreadsheetContentSchema>;
export type SpreadsheetCell = z.infer<typeof spreadsheetCellSchema>;
export type PdfContent = z.infer<typeof pdfContentSchema>;
export type PdfTextItem = z.infer<typeof pdfTextItemSchema>;
