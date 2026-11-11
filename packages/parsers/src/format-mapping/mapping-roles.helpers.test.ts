import {
  APP_ERROR_CODE,
  COLUMN_ROLE,
  DATE_ORDER,
  DECIMAL_SEPARATOR,
  formatMappingSchema,
  ROLES_PROBLEM,
} from "@xtrakto/core";
import type { ExtractedContent, SpreadsheetCell } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { fixtureContent } from "../../fixtures/fixture.utils";
import {
  MAPPED_FIXTURE_MAPPINGS,
  MAPPED_FIXTURES,
  type MappedFixtureName,
} from "../../fixtures/mapped-fixtures";
import { mappingParser } from "./mapping-parser.helpers";
import { mappingFromChoices, mappingFromRoles } from "./mapping-roles.helpers";

const {
  DATE,
  DESCRIPTION,
  AMOUNT,
  MONEY_OUT,
  MONEY_IN,
  BALANCE,
  DIRECTION,
  NONE,
} = COLUMN_ROLE;

const NAMES = Object.keys(MAPPED_FIXTURES) as MappedFixtureName[];
const OUT_IN = fixtureContent(MAPPED_FIXTURES["mapped-out-in"]);

const spreadsheet = (rows: SpreadsheetCell[][]): ExtractedContent => ({
  type: "spreadsheet",
  sheets: [{ name: "Hoja1", rows }],
});

const failure = (details: object) => ({
  ok: false,
  error: { code: APP_ERROR_CODE.PARSE_FAILED, details },
});

describe("mappingFromRoles", () => {
  it.each(NAMES)("reads %s's formats as a person wrote its mapping", (name) => {
    const content = fixtureContent(MAPPED_FIXTURES[name]);
    const expected = MAPPED_FIXTURE_MAPPINGS[name];
    const mapping = mappingFromRoles(content, expected.columns);

    expect(mapping).toEqual({
      ok: true,
      value: formatMappingSchema.parse(expected),
    });
    expect(mapping.ok && mappingParser(mapping.value).parse(content).ok).toBe(
      true,
    );
  });

  it("reads the decimal separator from the amounts and balances only", () => {
    // Money in and out swapped: the separator reads the same.
    const roles = [DATE, DESCRIPTION, NONE, MONEY_IN, MONEY_OUT, BALANCE];

    expect(mappingFromRoles(OUT_IN, roles)).toMatchObject({
      ok: true,
      value: { columns: roles, decimalSeparator: "," },
    });
  });

  it("fails roles that aren't one for each column", () => {
    const roles = [DATE, DESCRIPTION, NONE, MONEY_OUT, MONEY_IN];

    expect(mappingFromRoles(OUT_IN, roles)).toEqual(
      failure({ reason: "invalid_mapping" }),
    );
  });

  it.each([
    {
      roles: [NONE, DESCRIPTION, NONE, MONEY_OUT, MONEY_IN, BALANCE],
      cause: ROLES_PROBLEM.DATE,
    },
    {
      roles: [DATE, DESCRIPTION, AMOUNT, MONEY_OUT, MONEY_IN, BALANCE],
      cause: ROLES_PROBLEM.MONEY,
    },
  ])(
    "fails roles that read no table, saying why: $cause",
    ({ roles, cause }) => {
      expect(mappingFromRoles(OUT_IN, roles)).toEqual(
        failure({ reason: "invalid_mapping", cause }),
      );
    },
  );

  it("fails dates no order reads, with their column", () => {
    const content = spreadsheet([
      ["FECHA", "DETALLE", "VALOR"],
      ["15/03/2026", "COMPRA", "-85.400,00"],
      ["03/16/2026", "ABONO", "4.200.000,00"],
    ]);

    expect(mappingFromRoles(content, [DATE, DESCRIPTION, AMOUNT])).toEqual(
      failure({
        reason: "invalid_value",
        column: "FECHA",
        cause: "date_format",
      }),
    );
  });

  it("fails a direction column whose words aren't a bank's, with its column", () => {
    // The branch's numbers read as no way money goes.
    const roles = [DATE, DESCRIPTION, DIRECTION, AMOUNT, NONE, BALANCE];

    expect(mappingFromRoles(OUT_IN, roles)).toEqual(
      failure({
        reason: "invalid_value",
        column: "OFICINA",
        cause: "direction",
      }),
    );
  });

  it("finds no table in content without one", () => {
    expect(
      mappingFromRoles(spreadsheet([["Hola"]]), [DATE, DESCRIPTION, AMOUNT]),
    ).toMatchObject({
      ok: false,
      error: { code: APP_ERROR_CODE.UNKNOWN_FORMAT },
    });
  });
});

describe("mappingFromChoices", () => {
  const { columns } = MAPPED_FIXTURE_MAPPINGS["mapped-out-in"];

  it("keeps the formats the person chose over those the cells write", () => {
    const choices = {
      roles: columns,
      dateOrder: DATE_ORDER.MONTH_DAY_YEAR,
      decimalSeparator: DECIMAL_SEPARATOR.POINT,
    };

    expect(mappingFromChoices(OUT_IN, choices)).toMatchObject({
      ok: true,
      value: { dateOrder: "mdy", decimalSeparator: "." },
    });
  });

  it("reads the formats the person left unset from the cells", () => {
    const choices = {
      roles: columns,
      decimalSeparator: DECIMAL_SEPARATOR.POINT,
    };

    expect(mappingFromChoices(OUT_IN, choices)).toMatchObject({
      ok: true,
      value: { dateOrder: "dmy", decimalSeparator: "." },
    });
  });
});
