import { describe, expect, it } from "vitest";
import type { ExtractedContent, PdfContent } from "@xtrakto/core";
import { fixtureContent } from "../../fixtures/fixture.utils";
import movementsBasic from "../../fixtures/movements-basic.json";
import movementsBasicPdf from "../../fixtures/movements-basic-pdf.json";
import movementsOverlapPdf from "../../fixtures/movements-overlap-pdf.json";
import { minimizeMovementsPdf } from "./movements-pdf-minimize.helpers";
import { bancolombiaMovementsPdfParser } from "./movements-pdf-parser.helpers";

const FIXTURES = {
  "movements-basic-pdf": movementsBasicPdf,
  "movements-overlap-pdf": movementsOverlapPdf,
};

const pdfOf = (content: ExtractedContent): PdfContent => {
  if (content.type !== "pdf") throw new Error("Not a PDF.");
  return content;
};

const BASIC_PDF = pdfOf(fixtureContent(movementsBasicPdf));

const texts = (content: ExtractedContent): string[] =>
  pdfOf(content).pages.flatMap(({ items }) => items.map(({ str }) => str));

const parse = (content: ExtractedContent) =>
  bancolombiaMovementsPdfParser.parse(content);

describe("minimizeMovementsPdf", () => {
  it.each(Object.entries(FIXTURES))(
    "keeps %s reading exactly as before, where each movement sits included",
    (_name, fixture) => {
      const content = fixtureContent(fixture);

      expect(parse(content).ok).toBe(true);
      expect(parse(minimizeMovementsPdf(content))).toEqual(parse(content));
    },
  );

  it.each(Object.entries(FIXTURES))(
    "changes nothing more when %s is minimized again",
    (_name, fixture) => {
      const minimized = minimizeMovementsPdf(fixtureContent(fixture));

      expect(minimizeMovementsPdf(minimized)).toEqual(minimized);
    },
  );

  it.each(Object.entries(FIXTURES))(
    "sends none of %s's titles, download time, IP addresses or full account number",
    (_name, fixture) => {
      const sent = texts(minimizeMovementsPdf(fixtureContent(fixture)));

      expect(
        sent.filter((text) =>
          /Sucursal Virtual|Movimientos:|Dirección IP|203\.0\.113|a\. m\.|123 - 456789/.test(
            text,
          ),
        ),
      ).toEqual([]);
      expect(sent).toContain("8901");
    },
  );

  it("masks long numbers in descriptions, and keeps references whole for the server to hash", () => {
    const content: ExtractedContent = {
      type: "pdf",
      pages: BASIC_PDF.pages.map(({ items }) => ({
        items: items.map((item) =>
          item.str === "PAGO LLAVE Maria Lopez"
            ? { ...item, str: "PAGO LLAVE 1234567" }
            : item,
        ),
      })),
    };
    const sent = texts(minimizeMovementsPdf(content));

    expect(sent).toContain("PAGO LLAVE ***4567");
    expect(sent).toEqual(expect.arrayContaining(["3001234567", "0099887766"]));
  });

  it("keeps every page's titles, so each table is found again", () => {
    const pages = pdfOf(minimizeMovementsPdf(BASIC_PDF)).pages;

    expect(
      pages.map(({ items }) =>
        items.filter(({ str }) =>
          ["Fecha", "Descripción", "Referencia", "Valor"].includes(str),
        ),
      ),
    ).toHaveLength(BASIC_PDF.pages.length);
    expect(
      pages.every(({ items }) => items.some(({ str }) => str === "Referencia")),
    ).toBe(true);
  });

  it("leaves a spreadsheet as it is", () => {
    const content = fixtureContent(movementsBasic);

    expect(minimizeMovementsPdf(content)).toBe(content);
  });
});
