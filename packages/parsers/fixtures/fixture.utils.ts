import { extractedContentSchema } from "@xtrakto/core";
import type { ExtractedContent } from "@xtrakto/core";
import type { SheetRows } from "../src/sheets/sheet.utils";

/** A fixture as extracted content, checked against its schema. */
export const fixtureContent = (fixture: unknown): ExtractedContent =>
  extractedContentSchema.parse(fixture);

/** The rows of a fixture's first sheet. */
export const fixtureRows = (fixture: unknown): SheetRows => {
  const content = fixtureContent(fixture);
  return content.type === "spreadsheet" ? (content.sheets[0]?.rows ?? []) : [];
};
