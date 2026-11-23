import { COLUMN_ROLE } from "@xtrakto/core";
import type {
  ColumnRole,
  ExtractedContent,
  SpreadsheetCell,
} from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { fixtureContent, fixtureRows } from "../../fixtures/fixture.utils";
import {
  MAPPED_FIXTURE_MAPPINGS,
  MAPPED_FIXTURES,
} from "../../fixtures/mapped-fixtures";
import { repairChoices } from "./mapping-repair.helpers";
import type { MappingReview } from "./mapping-review.helpers";

const { DATE, DESCRIPTION, MONEY_OUT, MONEY_IN, NONE } = COLUMN_ROLE;

const OUT_IN = MAPPED_FIXTURES["mapped-out-in"];
const OUT_IN_ROLES: readonly ColumnRole[] =
  MAPPED_FIXTURE_MAPPINGS["mapped-out-in"].columns;
const DIRECTION_ROLES: readonly ColumnRole[] =
  MAPPED_FIXTURE_MAPPINGS["mapped-direction"].columns;

// "Banco Horizonte"'s roles with its debits read as money in, its credits as
// money out.
const SWAPPED_ROLES = OUT_IN_ROLES.map((role) => {
  if (role === MONEY_OUT) return MONEY_IN;
  return role === MONEY_IN ? MONEY_OUT : role;
});

const spreadsheet = (rows: SpreadsheetCell[][]): ExtractedContent => ({
  type: "spreadsheet",
  sheets: [{ name: "Hoja1", rows }],
});

const balancesOf = (review: MappingReview | undefined) =>
  review?.reading.ok ? review.reading.value.test.balances : undefined;

describe("repairChoices", () => {
  it("turns money in and out the other way round when the balances prove it", () => {
    const repaired = repairChoices(fixtureContent(OUT_IN), {
      roles: SWAPPED_ROLES,
    });

    expect(repaired?.roles).toEqual(OUT_IN_ROLES);
    expect(balancesOf(repaired)).toMatchObject({
      isVerified: true,
      brokenRows: 0,
    });
  });

  it("reads a column left out as an amount's direction when the balances prove it, keeping the formats chosen", () => {
    const content = fixtureContent(MAPPED_FIXTURES["mapped-direction"]);
    // Its "TIPO" ("D" and "C") ignored, every amount read as money in.
    const roles = DIRECTION_ROLES.with(2, NONE);

    const repaired = repairChoices(content, { roles, decimalSeparator: "." });

    expect(repaired).toMatchObject({
      roles: DIRECTION_ROLES,
      decimalSeparator: ".",
    });
    expect(balancesOf(repaired)?.isVerified).toBe(true);
  });

  it("reads no column as the direction when its words aren't a bank's", () => {
    const rows = fixtureRows(MAPPED_FIXTURES["mapped-direction"]).map(
      (row, index) => (index === 0 ? [...row] : row.with(2, "X")),
    );

    expect(
      repairChoices(spreadsheet(rows), {
        roles: DIRECTION_ROLES.with(2, NONE),
      }),
    ).toBeUndefined();
  });

  it("repairs nothing in a file without balances, which nothing proves", () => {
    const content = fixtureContent(MAPPED_FIXTURES["mapped-no-balance"]);

    expect(
      repairChoices(content, {
        roles: [DATE, DESCRIPTION, MONEY_IN, MONEY_OUT],
      }),
    ).toBeUndefined();
  });

  it("repairs nothing when no repair makes the balances chain", () => {
    // One balance off: neither way round adds up.
    const rows = fixtureRows(OUT_IN).map((row) => [...row]);
    rows[10] = rows[10]?.with(5, "1,00") ?? [];

    expect(
      repairChoices(spreadsheet(rows), { roles: SWAPPED_ROLES }),
    ).toBeUndefined();
  });
});
