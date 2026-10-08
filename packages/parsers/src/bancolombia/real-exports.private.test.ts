import { describe, expect, it } from "vitest";
import { isWithinPeriod } from "@xtrakto/core";
import type {
  AppError,
  LocalDate,
  ParsedStatement,
  ParsedTransaction,
} from "@xtrakto/core";
import { readPrivateExports } from "../../fixtures/private-exports.mjs";
import { extractSpreadsheet } from "../extraction/spreadsheet-extraction.helpers";
import { reconcile } from "../reconciliation/reconciliation.helpers";
import { findParser } from "../registry/default-registry.helpers";
import { isBlankRow } from "../sheets/sheet.utils";
import {
  MOVEMENTS_EXPORT_FORMAT_ID,
  QUARTERLY_FORMAT_ID,
} from "./bancolombia.constants";

// Real exports a developer copies into the git-ignored fixtures/private/
// (Phase 2.8). Assertions only compare counts, yes/no answers, error codes
// and row numbers, so a failure never prints a description, an amount, a
// name or a file name.

const INTEREST = "ABONO INTERESES AHORROS";

type ReadExport = {
  readonly statement?: ParsedStatement;
  readonly failure?: AppError;
  readonly startsWithBlankRow?: boolean;
};

/** How an export's movements compare with its quarterly statement's. */
type Comparison = {
  /** Export movements whose description and amount the statement lacks. */
  readonly notInQuarterly: number;
  /** Export movements the statement has only on another date. */
  readonly otherDateDifferences: number;
  /** Statement movements on the export's dates that the export lacks. */
  readonly missingFromExport: number;
};

// Each file read as the app reads it: extracted, recognized and parsed.
const readExport = (bytes: Uint8Array): ReadExport => {
  const content = extractSpreadsheet(bytes);
  if (!content.ok) return { failure: content.error };
  const startsWithBlankRow = isBlankRow(content.value.sheets[0]?.rows[0] ?? []);
  const parser = findParser(content.value);
  if (!parser.ok) return { failure: parser.error, startsWithBlankRow };
  const statement = parser.value.parse(content.value);
  return statement.ok
    ? { statement: statement.value, startsWithBlankRow }
    : { failure: statement.error, startsWithBlankRow };
};

const dayBefore = (date: LocalDate): string =>
  new Date(
    Date.UTC(
      Number(date.slice(0, 4)),
      Number(date.slice(5, 7)) - 1,
      Number(date.slice(8)) - 1,
    ),
  )
    .toISOString()
    .slice(0, 10);

// Where the statement should date an export movement (Appendix A.2): on the
// same day, except interest, which the export moves one day later but never
// past its last day.
const expectedDates = (
  { date, descriptionNormalized }: ParsedTransaction,
  lastDay: LocalDate,
): readonly string[] => {
  if (descriptionNormalized !== INTEREST) return [date];
  return date === lastDay ? [dayBefore(date), date] : [dayBefore(date)];
};

const isSameMovement = (a: ParsedTransaction, b: ParsedTransaction) =>
  a.descriptionNormalized === b.descriptionNormalized &&
  a.amountMinor === b.amountMinor;

// Pairs each export movement with one statement movement: first on the
// expected dates, then, to tell the differences apart, on any date.
const compareMovements = (
  quarter: ParsedStatement,
  exported: ParsedStatement,
): Comparison => {
  const unused = new Set(quarter.transactions);
  const take = (
    movement: ParsedTransaction,
    isDateExpected: (date: string) => boolean,
  ): boolean => {
    const match = [...unused].find(
      (candidate) =>
        isSameMovement(candidate, movement) && isDateExpected(candidate.date),
    );
    if (match !== undefined) unused.delete(match);
    return match !== undefined;
  };
  const unmatched: ParsedTransaction[] = [];
  for (const movement of exported.transactions) {
    const dates = expectedDates(movement, exported.period.to);
    if (!take(movement, (date) => dates.includes(date)))
      unmatched.push(movement);
  }
  const otherDateDifferences = unmatched.filter((movement) =>
    take(movement, () => true),
  ).length;
  return {
    notInQuarterly: unmatched.length - otherDateDifferences,
    otherDateDifferences,
    missingFromExport: [...unused].filter(({ date }) =>
      isWithinPeriod(date, exported.period),
    ).length,
  };
};

const files = (await readPrivateExports()).map(readExport);

const ofFormat = (formatId: string) =>
  files.filter(({ statement }) => statement?.formatId === formatId);

const quarterlyFiles = ofFormat(QUARTERLY_FORMAT_ID);
const quarterlies = quarterlyFiles.flatMap(({ statement }) =>
  statement ? [statement] : [],
);
const movementExports = ofFormat(MOVEMENTS_EXPORT_FORMAT_ID).flatMap(
  ({ statement }) => (statement ? [statement] : []),
);

// Each export with the quarterly statement whose period holds all its dates.
const overlaps = movementExports.flatMap((exported) => {
  const quarter = quarterlies.find(
    ({ period }) =>
      isWithinPeriod(exported.period.from, period) &&
      isWithinPeriod(exported.period.to, period),
  );
  return quarter ? [{ quarter, exported }] : [];
});

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
      });
    }
  });

  it("finds no unexpected rows in the quarterly statements", () => {
    for (const { warnings } of quarterlies) expect(warnings).toEqual([]);
  });

  it("starts each quarterly statement with an empty row, as the fixtures do", () => {
    expect(quarterlyFiles.map((file) => file.startsWithBlankRow)).toEqual(
      quarterlyFiles.map(() => true),
    );
  });

  it("finds an export's movements in its quarterly statement, with only interest dated a day later", () => {
    expect(overlaps.length).toBeGreaterThan(0);
    for (const { quarter, exported } of overlaps) {
      expect(compareMovements(quarter, exported)).toEqual({
        notInQuarterly: 0,
        otherDateDifferences: 0,
        missingFromExport: 0,
      });
    }
  });
});
