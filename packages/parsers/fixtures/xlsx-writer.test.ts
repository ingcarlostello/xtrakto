import { describe, expect, it } from "vitest";
import { ok } from "@xtrakto/core";
import { extractSpreadsheet } from "../src/extraction/spreadsheet-extraction.helpers";
import { fixtureContent } from "./fixture.utils";
import mappedDirection from "./mapped-direction.json";
import mappedNewestFirst from "./mapped-newest-first.json";
import mappedNoBalance from "./mapped-no-balance.json";
import mappedOutIn from "./mapped-out-in.json";
import mappedTitleRows from "./mapped-title-rows.json";
import movementsBasic from "./movements-basic.json";
import movementsOverlap from "./movements-overlap.json";
import quarterlyBasic from "./quarterly-basic.json";
import quarterlyBrokenBalance from "./quarterly-broken-balance.json";
import quarterlyLarge from "./quarterly-large.json";
import quarterlyPrevious from "./quarterly-previous.json";
import quarterlyRepeatedHeader from "./quarterly-repeated-header.json";
import quarterlyYearRollover from "./quarterly-year-rollover.json";
import { contentToXlsx } from "./xlsx-writer.mjs";

const FIXTURES = {
  "quarterly-basic": quarterlyBasic,
  "quarterly-previous": quarterlyPrevious,
  "quarterly-year-rollover": quarterlyYearRollover,
  "quarterly-repeated-header": quarterlyRepeatedHeader,
  "quarterly-broken-balance": quarterlyBrokenBalance,
  "quarterly-large": quarterlyLarge,
  "movements-basic": movementsBasic,
  "movements-overlap": movementsOverlap,
  "mapped-out-in": mappedOutIn,
  "mapped-newest-first": mappedNewestFirst,
  "mapped-direction": mappedDirection,
  "mapped-no-balance": mappedNoBalance,
  "mapped-title-rows": mappedTitleRows,
};

describe("contentToXlsx", () => {
  it.each(Object.entries(FIXTURES))(
    "writes %s so that extraction reads it back unchanged",
    (_name, fixture) => {
      const content = fixtureContent(fixture);
      if (content.type !== "spreadsheet") throw new Error("Not a spreadsheet.");

      expect(extractSpreadsheet(contentToXlsx(content))).toEqual(ok(content));
    },
  );
});
