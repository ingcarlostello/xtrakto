import { describe, expect, it } from "vitest";
import {
  addDaysTo,
  type ExtractedContent,
  isWithinPeriod,
  type LocalDate,
  type ParsedStatement,
  type ParsedTransaction,
  type Period,
} from "@xtrakto/core";
import {
  readPrivateExports,
  readPrivatePdfs,
} from "../../fixtures/private-exports.mjs";
import { extractPdf } from "../extraction/pdf-extraction.helpers";
import { extractSpreadsheet } from "../extraction/spreadsheet-extraction.helpers";
import { findParser } from "../registry/default-registry.helpers";
import {
  INTEREST_DESCRIPTION,
  MOVEMENTS_EXPORT_FORMAT_ID,
  QUARTERLY_FORMAT_ID,
  QUARTERLY_PDF_FORMAT_ID,
} from "./bancolombia.constants";
import {
  type MatchableMovement,
  matchMovements,
} from "./movement-matching.helpers";

// The human's real files in the git-ignored fixtures/private/ (Phase 10.1a):
// each movements export matched with its quarterly statement, in Excel and
// in PDF, as ingestion matches them. Assertions compare counts only, so a
// failure never prints a description, an amount, a name or a file name.

const parsedOf = (content: ExtractedContent): ParsedStatement[] => {
  const parser = findParser(content);
  const parsed = parser.ok ? parser.value.parse(content) : undefined;
  return parsed?.ok ? [parsed.value] : [];
};

const spreadsheets = (await readPrivateExports()).flatMap((bytes) => {
  const content = extractSpreadsheet(bytes);
  return content.ok ? parsedOf(content.value) : [];
});

const pdfs = (
  await Promise.all((await readPrivatePdfs()).map((bytes) => extractPdf(bytes)))
).flatMap((content) => (content.ok ? parsedOf(content.value) : []));

const quarterlies = [...spreadsheets, ...pdfs].filter(({ formatId }) =>
  [QUARTERLY_FORMAT_ID, QUARTERLY_PDF_FORMAT_ID].includes(formatId),
);
const movementExports = spreadsheets.filter(
  ({ formatId }) => formatId === MOVEMENTS_EXPORT_FORMAT_ID,
);

// Its movements as ingestion saves them, in the bank's order.
const matchable = (
  { transactions }: ParsedStatement,
  prefix: string,
): MatchableMovement[] =>
  transactions.map(
    ({ date, descriptionNormalized, amountMinor }, position) => ({
      id: `${prefix}${position}`,
      date,
      descriptionNormalized,
      amountMinor,
      position,
    }),
  );

// A quarterly statement's days: after its opening balance's.
const covers = ({ period }: ParsedStatement, date: LocalDate) =>
  date > period.from && date <= period.to;

const isMonthEnd = (date: LocalDate) => addDaysTo(date, 1).endsWith("-01");

// The day the export gives a statement's movement: interest on the day it
// was paid, the next one but at a month's end (Appendix A.2).
const exportDateOf = ({ date, descriptionNormalized }: ParsedTransaction) =>
  descriptionNormalized === INTEREST_DESCRIPTION && !isMonthEnd(date)
    ? addDaysTo(date, 1)
    : date;

// Each export with each quarterly statement whose days hold all of its.
const pairs = movementExports.flatMap((exported) =>
  quarterlies
    .filter(
      (quarter) =>
        covers(quarter, exported.period.from) &&
        covers(quarter, exported.period.to),
    )
    .map((quarter) => ({ quarter, exported })),
);

/** How an export's movements match its quarterly statement's, in counts. */
const compare = (quarter: ParsedStatement, exported: ParsedStatement) => {
  const matches = matchMovements(
    matchable(quarter, "q"),
    matchable(exported, "e"),
  );
  const matched = new Set(matches.map(({ quarterlyId }) => quarterlyId));
  return {
    notInQuarterly: exported.transactions.length - matches.length,
    missingFromExport: quarter.transactions.filter(
      (movement, position) =>
        !matched.has(`q${position}`) &&
        isWithinPeriod(exportDateOf(movement), exported.period),
    ).length,
  };
};

const monthEndOf = (date: LocalDate): LocalDate => {
  let day = date;
  while (!isMonthEnd(day)) day = addDaysTo(day, 1);
  return day;
};

const later = (a: LocalDate, b: LocalDate) => (a > b ? a : b);
const earlier = (a: LocalDate, b: LocalDate) => (a < b ? a : b);

// Two exports that share a month's last day, one going past it: whether the
// bank dates that day's interest by where each range ends.
const acrossMonthEnd = movementExports.flatMap((first, index) =>
  movementExports.slice(index + 1).flatMap((second) => {
    const shared: Period = {
      from: later(first.period.from, second.period.from),
      to: earlier(first.period.to, second.period.to),
    };
    const monthEnd = monthEndOf(shared.from);
    const goesPast = [first, second].some(({ period }) => period.to > monthEnd);
    return shared.from <= shared.to && monthEnd <= shared.to && goesPast
      ? [{ first, second, shared }]
      : [];
  }),
);

const movementsOn = ({ transactions }: ParsedStatement, days: Period) =>
  transactions
    .filter(({ date }) => isWithinPeriod(date, days))
    .map(
      ({ date, descriptionNormalized, amountMinor }) =>
        `${date} ${descriptionNormalized} ${amountMinor}`,
    );

// How many movements one list has that the other lacks, either way.
const differences = (a: readonly string[], b: readonly string[]): number => {
  const counts = new Map<string, number>();
  for (const key of a) counts.set(key, (counts.get(key) ?? 0) + 1);
  for (const key of b) counts.set(key, (counts.get(key) ?? 0) - 1);
  return [...counts.values()].reduce((sum, count) => sum + Math.abs(count), 0);
};

describe.skipIf(pairs.length === 0)(
  "real movements exports matched with their quarterly statements",
  () => {
    it("pairs exports with quarterly statements in Excel and in PDF", () => {
      expect(new Set(pairs.map(({ quarter }) => quarter.formatId))).toEqual(
        new Set([QUARTERLY_FORMAT_ID, QUARTERLY_PDF_FORMAT_ID]),
      );
    });

    it("matches an export's movements one to one with its quarterly statement's", async ({
      annotate,
    }) => {
      for (const { quarter, exported } of pairs)
        expect(compare(quarter, exported)).toEqual({
          notInQuarterly: 0,
          missingFromExport: 0,
        });
      const movements = pairs.reduce(
        (sum, { exported }) => sum + exported.transactions.length,
        0,
      );
      await annotate(
        `${pairs.length} pares de archivo y trimestral; ${movements} movimientos emparejados`,
        "emparejados",
      );
    });

    it.skipIf(acrossMonthEnd.length === 0)(
      "dates every movement alike in two exports that share a month's last day",
      () => {
        for (const { first, second, shared } of acrossMonthEnd)
          expect(
            differences(
              movementsOn(first, shared),
              movementsOn(second, shared),
            ),
          ).toBe(0);
      },
    );
  },
);
