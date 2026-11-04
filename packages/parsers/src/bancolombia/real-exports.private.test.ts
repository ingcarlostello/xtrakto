import { describe, expect, it } from "vitest";
import type { AppError, LocalDate, ParsedStatement } from "@xtrakto/core";
import { readPrivateExports } from "../../fixtures/private-exports.mjs";
import { extractSpreadsheet } from "../extraction/spreadsheet-extraction.helpers";
import { reconcile } from "../reconciliation/reconciliation.helpers";
import { findParser } from "../registry/default-registry.helpers";
import {
  MOVEMENTS_EXPORT_FORMAT_ID,
  QUARTERLY_FORMAT_ID,
} from "./bancolombia.constants";
import { findExportColumns } from "./movements-export.helpers";

// Real exports a developer copies into the git-ignored fixtures/private/ or
// its folders (Phase 2.8). Assertions only compare counts, yes/no answers, error codes
// and row numbers, so a failure never prints a description, an amount, a
// name or a file name.

const LONG_NUMBER = /\d{6,}/;

type ReadExport = {
  readonly statement?: ParsedStatement;
  readonly failure?: AppError;
};

// Each file read as the app reads it: extracted, recognized and parsed.
const readExport = (bytes: Uint8Array): ReadExport => {
  const content = extractSpreadsheet(bytes);
  if (!content.ok) return { failure: content.error };
  const parser = findParser(content.value);
  if (!parser.ok) return { failure: parser.error };
  const statement = parser.value.parse(content.value);
  return statement.ok
    ? { statement: statement.value }
    : { failure: statement.error };
};

const shiftDays = (date: LocalDate, days: number): string =>
  new Date(
    Date.UTC(
      Number(date.slice(0, 4)),
      Number(date.slice(5, 7)) - 1,
      Number(date.slice(8)) + days,
    ),
  )
    .toISOString()
    .slice(0, 10);

/** What minimizing a file before it's sent does to it (ADR 0017). */
type Minimized = {
  /** Whether the minimized content parses exactly as the original. */
  readonly isSameParse: boolean;
  /** Cells with a long number left, except an export's references. */
  readonly longNumbers: number;
};

// Compared through JSON, so a difference prints a yes or no, never content.
const minimizeExport = (bytes: Uint8Array): Minimized | undefined => {
  const content = extractSpreadsheet(bytes);
  if (!content.ok) return undefined;
  const parser = findParser(content.value);
  if (!parser.ok) return undefined;
  const { minimize, parse } = parser.value;
  const minimized = minimize(content.value);
  const rows =
    minimized.type === "spreadsheet" ? (minimized.sheets[0]?.rows ?? []) : [];
  const columns = findExportColumns(rows);
  // The server needs references whole, to hash them.
  const references = columns.ok ? columns.value.REFERENCE : undefined;
  const longNumbers = rows
    .flatMap((row) => row.filter((_, index) => index !== references))
    .filter(
      (cell) => typeof cell === "string" && LONG_NUMBER.test(cell),
    ).length;
  return {
    isSameParse:
      JSON.stringify(parse(minimized)) === JSON.stringify(parse(content.value)),
    longNumbers,
  };
};

const exportBytes = await readPrivateExports();
const files = exportBytes.map(readExport);
const minimizedFiles = exportBytes.map(minimizeExport);

const ofFormat = (formatId: string) =>
  files.filter(({ statement }) => statement?.formatId === formatId);

const quarterlyFiles = ofFormat(QUARTERLY_FORMAT_ID);
const quarterlies = quarterlyFiles.flatMap(({ statement }) =>
  statement ? [statement] : [],
);
const movementExports = ofFormat(MOVEMENTS_EXPORT_FORMAT_ID).flatMap(
  ({ statement }) => (statement ? [statement] : []),
);

// Each quarterly statement with the next one of its account that starts the
// day it ends or the day after: back to back, as a chain needs them (5.6c).
const backToBack = quarterlies.flatMap((previous) =>
  quarterlies
    .filter(
      ({ accountLast4, period }) =>
        accountLast4 === previous.accountLast4 &&
        [previous.period.to, shiftDays(previous.period.to, 1)].includes(
          period.from,
        ),
    )
    .map((next) => ({ previous, next })),
);

describe.skipIf(files.length === 0)("real Bancolombia exports", () => {
  it("reads every file as a supported format", () => {
    expect(files.map(({ failure }) => failure)).toEqual(
      files.map(() => undefined),
    );
  });

  it("has a quarterly statement and a movements export", () => {
    expect(quarterlies.length).toBeGreaterThan(0);
    expect(movementExports.length).toBeGreaterThan(0);
  });

  it("reconciles each quarterly statement to the cent", () => {
    for (const statement of quarterlies) {
      expect(reconcile(statement)).toEqual({
        balanceVerified: true,
        issues: [],
        closingDifferenceMinor: 0,
      });
    }
  });

  it("parses every minimized file exactly as the original", () => {
    expect(minimizedFiles.filter((file) => !file?.isSameParse).length).toBe(0);
  });

  it("leaves long numbers only in an export's references once minimized", () => {
    expect(
      minimizedFiles.map((file) => file?.longNumbers ?? 0).filter(Boolean),
    ).toEqual([]);
  });

  // The app chains a statement to the one ending the day it starts, on its
  // closing balance: true only if the bank's periods share that day.
  it.skipIf(backToBack.length === 0)(
    "starts each quarterly statement the day the previous one ends, on its closing balance",
    () => {
      expect(
        backToBack.filter(
          ({ previous, next }) =>
            next.period.from !== previous.period.to ||
            next.openingBalanceMinor !== previous.closingBalanceMinor,
        ).length,
      ).toBe(0);
    },
  );

  it("finds no unexpected rows in the quarterly statements", () => {
    for (const { warnings } of quarterlies) expect(warnings).toEqual([]);
  });
});
