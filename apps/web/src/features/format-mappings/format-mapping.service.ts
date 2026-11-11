import "server-only";
import { APP_ERROR_CODE, err, ok } from "@xtrakto/core";
import type { ExtractedContent, FormatMapping, Result } from "@xtrakto/core";
import {
  findFormatMapping,
  saveOwnFormatMapping,
  shareFormatMapping,
  type UserContext,
} from "@xtrakto/db";
import { type BankParser, findParser, findTable } from "@xtrakto/parsers";
import { proveMapping } from "./format-mapping.helpers";

const unknownFormat: Result<never> = err({
  code: APP_ERROR_CODE.UNKNOWN_FORMAT,
});

// A mapping the person confirmed reads their files of its format from now
// on, and every user's once its balances prove it, unless another one does
// already.
const readWithConfirmed = async (
  ctx: UserContext,
  content: ExtractedContent,
  mapping: FormatMapping,
): Promise<Result<BankParser>> => {
  const proven = proveMapping(content, mapping);
  if (!proven.ok) return proven;
  await saveOwnFormatMapping(ctx, mapping);
  if (proven.value.isVerified) await shareFormatMapping(ctx, mapping);
  return ok(proven.value.parser);
};

const readWithSaved = async (
  ctx: UserContext,
  content: ExtractedContent,
): Promise<Result<BankParser>> => {
  const table = findTable(content);
  if (!table.ok) return table;
  const saved = await findFormatMapping(ctx, table.value.header);
  if (saved === undefined) return unknownFormat;
  const proven = proveMapping(content, saved.mapping);
  return proven.ok ? ok(proven.value.parser) : proven;
};

/**
 * The parser that reads a statement for the user: a known format's; else,
 * for a spreadsheet no parser knows, the mapping the person confirmed with
 * it, which is then saved; else the one saved for its format, the person's
 * before everyone's (Stage 11). Content without a table or a mapping is
 * `UNKNOWN_FORMAT`; a mapping that doesn't read it, `PARSE_FAILED`.
 */
export const findStatementParser = async (
  ctx: UserContext,
  content: ExtractedContent,
  confirmed?: FormatMapping,
): Promise<Result<BankParser>> => {
  const known = findParser(content);
  if (known.ok) return known;
  return confirmed === undefined
    ? readWithSaved(ctx, content)
    : readWithConfirmed(ctx, content, confirmed);
};
