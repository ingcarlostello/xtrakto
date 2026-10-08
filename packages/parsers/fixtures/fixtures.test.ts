import { describe, expect, it } from "vitest";
import { extractedContentSchema } from "@xtrakto/core";
import movementsBasic from "./movements-basic.json";
import movementsOverlap from "./movements-overlap.json";
import quarterlyBasic from "./quarterly-basic.json";
import quarterlyBrokenBalance from "./quarterly-broken-balance.json";
import quarterlyLarge from "./quarterly-large.json";
import quarterlyRepeatedHeader from "./quarterly-repeated-header.json";
import quarterlyYearRollover from "./quarterly-year-rollover.json";

const FIXTURES = {
  "quarterly-basic": quarterlyBasic,
  "quarterly-year-rollover": quarterlyYearRollover,
  "quarterly-repeated-header": quarterlyRepeatedHeader,
  "quarterly-broken-balance": quarterlyBrokenBalance,
  "quarterly-large": quarterlyLarge,
  "movements-basic": movementsBasic,
  "movements-overlap": movementsOverlap,
};

describe("synthetic fixtures", () => {
  it.each(Object.entries(FIXTURES))(
    "%s is valid extracted content",
    (_name, fixture) => {
      expect(extractedContentSchema.safeParse(fixture).error).toBeUndefined();
    },
  );
});
