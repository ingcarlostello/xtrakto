import { describe, expect, it } from "vitest";
import type { ExtractedContent, PdfContent } from "@xtrakto/core";
import { fixtureContent } from "../../fixtures/fixture.utils";
import quarterlyBasic from "../../fixtures/quarterly-basic.json";
import quarterlyBasicPdf from "../../fixtures/quarterly-basic-pdf.json";
import quarterlyLargePdf from "../../fixtures/quarterly-large-pdf.json";
import { minimizeQuarterlyPdf } from "./quarterly-pdf-minimize.helpers";
import { bancolombiaQuarterlyPdfParser } from "./quarterly-pdf-parser.helpers";

const FIXTURES = {
  "quarterly-basic-pdf": quarterlyBasicPdf,
  "quarterly-large-pdf": quarterlyLargePdf,
};

const pdfOf = (content: ExtractedContent): PdfContent => {
  if (content.type !== "pdf") throw new Error("Not a PDF.");
  return content;
};

const texts = (content: ExtractedContent): string[] =>
  pdfOf(content).pages.flatMap(({ items }) => items.map(({ str }) => str));

const parse = (content: ExtractedContent) =>
  bancolombiaQuarterlyPdfParser.parse(content);

describe("minimizeQuarterlyPdf", () => {
  it.each(Object.entries(FIXTURES))(
    "keeps %s reading exactly as before, where each movement sits included",
    (_name, fixture) => {
      const content = fixtureContent(fixture);

      expect(parse(content).ok).toBe(true);
      expect(parse(minimizeQuarterlyPdf(content))).toEqual(parse(content));
    },
  );

  it.each(Object.entries(FIXTURES))(
    "changes nothing more when %s is minimized again",
    (_name, fixture) => {
      const minimized = minimizeQuarterlyPdf(fixtureContent(fixture));

      expect(minimizeQuarterlyPdf(minimized)).toEqual(minimized);
    },
  );

  it.each(Object.entries(FIXTURES))(
    "sends none of %s's address, city, branch, promotions, footers or full account number",
    (_name, fixture) => {
      const sent = texts(minimizeQuarterlyPdf(fixtureContent(fixture)));

      for (const word of [
        "calle",
        "MEDELLIN",
        "CENTRO",
        "CORRESPONSA",
        "Consulta",
        "DCF:defensor@ejemplo.com.co",
        "PÁGINA:",
      ]) {
        expect(sent).not.toContain(word);
      }
      expect(sent.filter((text) => /\d{6,}/.test(text))).toEqual([]);
    },
  );

  it("sends the account's last 4 digits where its number was, as wide as their characters", () => {
    const original = pdfOf(fixtureContent(quarterlyBasicPdf));
    const number = original.pages[0]?.items.find(
      ({ str }) => str === "12345678901",
    );
    const sent = pdfOf(minimizeQuarterlyPdf(original)).pages[0]?.items.find(
      ({ str }) => str === "8901",
    );

    expect(number).toBeDefined();
    expect(sent).toEqual({
      ...number,
      str: "8901",
      width: Math.round((((number?.width ?? 0) * 4) / 11) * 100) / 100,
    });
  });

  it("masks the long numbers in the descriptions it sends", () => {
    const original = pdfOf(fixtureContent(quarterlyBasicPdf));
    const withNumber: PdfContent = {
      type: "pdf",
      pages: original.pages.map(({ items }) => ({
        items: items.map((item) =>
          item.str === "Ejemplo" ? { ...item, str: "1234567" } : item,
        ),
      })),
    };
    const sent = texts(minimizeQuarterlyPdf(withNumber));

    expect(sent).toContain("***4567");
    expect(sent).not.toContain("1234567");
  });

  it("sends each page's table titles, so every page's table is found again", () => {
    const sent = pdfOf(minimizeQuarterlyPdf(fixtureContent(quarterlyLargePdf)));

    for (const { items } of sent.pages) {
      expect(items.map(({ str }) => str)).toEqual(
        expect.arrayContaining([
          "FECHA",
          "DESCRIPCIÓN",
          "SUCURSAL",
          "DCTO.",
          "VALOR",
          "SALDO",
        ]),
      );
    }
  });

  it("returns a spreadsheet unchanged", () => {
    const content = fixtureContent(quarterlyBasic);

    expect(minimizeQuarterlyPdf(content)).toBe(content);
  });
});
