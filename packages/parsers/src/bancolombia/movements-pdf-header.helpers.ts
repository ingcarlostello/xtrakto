import { ok } from "@xtrakto/core";
import type { ParsedStatement, Result } from "@xtrakto/core";
import { normalizeDescription } from "../descriptions/description.helpers";
import type { PdfLine, PdfSegment } from "../pdf-layout/pdf-layout.types";
import { comparableText } from "../sheets/sheet.utils";
import {
  MOVEMENTS_PDF_ACCOUNT_NUMBER,
  MOVEMENTS_PDF_BLOCK,
  MOVEMENTS_PDF_FIELD,
  PDF_ACCOUNT_TYPE,
} from "./bancolombia.constants";
import { parseFailed } from "../registry/parse-failure.helpers";
import { accountOf } from "./quarterly-header.helpers";

/** What the movements export's PDF says of its account, before its table. */
export type MovementsPdfHeader = Required<
  Pick<ParsedStatement, "holderName" | "accountType" | "accountLast4">
>;

/**
 * Where the first page prints the holder, the account's type and its number;
 * a field it doesn't print is missing.
 */
export type MovementsPdfHeaderParts = {
  readonly holder?: PdfSegment;
  readonly type?: PdfSegment;
  readonly number?: PdfSegment;
};

// The holder's name is in capitals, without digits, unlike the page's titles
// and the date and time it was downloaded.
const isHolderName = (text: string): boolean =>
  /\p{Lu}/u.test(text) && !/[\p{Ll}\d]/u.test(text);

/**
 * Finds the header's fields in the lines above the movements table by what
 * they say, never by fixed positions: the account's type, which starts with
 * "Cuenta", its number after it, and, above them, the holder, the text in
 * capitals, which has no label. The page's titles and the date and time it
 * was downloaded are never read.
 */
export const findMovementsPdfHeader = (
  lines: readonly PdfLine[],
): MovementsPdfHeaderParts => {
  const segments = lines.flatMap((line) => line.segments);
  const typeAt = segments.findIndex(({ text }) =>
    PDF_ACCOUNT_TYPE.test(comparableText(text)),
  );
  const above = typeAt === -1 ? segments : segments.slice(0, typeAt);
  return {
    holder: above.find(({ text }) => isHolderName(text)),
    type: segments[typeAt],
    number:
      typeAt === -1
        ? undefined
        : segments
            .slice(typeAt + 1)
            .find(({ text }) => MOVEMENTS_PDF_ACCOUNT_NUMBER.test(text)),
  };
};

const missing = (column: string): Result<never> =>
  parseFailed({ reason: "missing_value", block: MOVEMENTS_PDF_BLOCK, column });

/**
 * Reads the header's fields as the quarterly statement's are read: the
 * holder's name, and a savings account by the last 4 digits of its number.
 */
export const readMovementsPdfHeader = (
  parts: MovementsPdfHeaderParts,
): Result<MovementsPdfHeader> => {
  if (parts.holder === undefined) return missing(MOVEMENTS_PDF_FIELD.HOLDER);
  if (parts.type === undefined) return missing(MOVEMENTS_PDF_FIELD.TYPE);
  if (parts.number === undefined) return missing(MOVEMENTS_PDF_FIELD.NUMBER);
  const account = accountOf(
    {
      type: comparableText(parts.type.text),
      number: parts.number.text.replace(/\D/g, ""),
    },
    {
      block: MOVEMENTS_PDF_BLOCK,
      typeColumn: MOVEMENTS_PDF_FIELD.TYPE,
      numberColumn: MOVEMENTS_PDF_FIELD.NUMBER,
    },
  );
  if (!account.ok) return account;
  return ok({
    holderName: normalizeDescription(parts.holder.text),
    ...account.value,
  });
};
