import { describe, expect, it } from "vitest";
import { ok } from "@xtrakto/core";
import { extractSpreadsheet } from "../src/extraction/spreadsheet-extraction.helpers";
import { fixtureContent } from "./fixture.utils";
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
