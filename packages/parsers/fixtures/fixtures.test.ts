import { describe, expect, it } from "vitest";
import { extractedContentSchema } from "@xtrakto/core";
import movementsBasic from "./movements-basic.json";
import movementsBasicPdf from "./movements-basic-pdf.json";
import movementsOverlap from "./movements-overlap.json";
import movementsOverlapPdf from "./movements-overlap-pdf.json";
import quarterlyBasic from "./quarterly-basic.json";
import quarterlyBasicPdf from "./quarterly-basic-pdf.json";
import quarterlyBrokenBalance from "./quarterly-broken-balance.json";
import quarterlyLarge from "./quarterly-large.json";
import quarterlyLargePdf from "./quarterly-large-pdf.json";
import quarterlyPrevious from "./quarterly-previous.json";
import quarterlyRepeatedHeader from "./quarterly-repeated-header.json";
import quarterlyYearRollover from "./quarterly-year-rollover.json";

const FIXTURES = {
  "quarterly-basic": quarterlyBasic,
  "quarterly-previous": quarterlyPrevious,
  "quarterly-year-rollover": quarterlyYearRollover,
  "quarterly-repeated-header": quarterlyRepeatedHeader,
  "quarterly-broken-balance": quarterlyBrokenBalance,
  "quarterly-large": quarterlyLarge,
  "quarterly-basic-pdf": quarterlyBasicPdf,
  "quarterly-large-pdf": quarterlyLargePdf,
  "movements-basic": movementsBasic,
  "movements-overlap": movementsOverlap,
  "movements-basic-pdf": movementsBasicPdf,
  "movements-overlap-pdf": movementsOverlapPdf,
};

describe("synthetic fixtures", () => {
  it.each(Object.entries(FIXTURES))(
    "%s is valid extracted content",
    (_name, fixture) => {
      expect(extractedContentSchema.safeParse(fixture).error).toBeUndefined();
    },
  );
});
