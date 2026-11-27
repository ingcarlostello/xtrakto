import { describe, expect, it } from "vitest";
import type { ExtractedContent, PdfContent } from "@xtrakto/core";
import cardBasic from "../../fixtures/card-basic.json";
import cardBasicPdf from "../../fixtures/card-basic-pdf.json";
import cardBrokenPdf from "../../fixtures/card-broken-pdf.json";
import cardDollarsPdf from "../../fixtures/card-dollars-pdf.json";
import { fixtureContent } from "../../fixtures/fixture.utils";
import { minimizeCardPdf } from "./card-pdf-minimize.helpers";
import { bancolombiaCardPdfParser } from "./card-pdf-parser.helpers";

const pdfOf = (fixture: unknown): PdfContent => {
  const content = fixtureContent(fixture);
  if (content.type !== "pdf") throw new Error("Not a PDF fixture.");
  return content;
};

const CARDS = [
  ["card-basic-pdf", cardBasicPdf],
  ["card-dollars-pdf", cardDollarsPdf],
  ["card-broken-pdf", cardBrokenPdf],
].map(([name, fixture]) => [name, pdfOf(fixture)] as const);

const LONG_NUMBER = /\d{6,}/;
// Amounts as the PDF writes them, whose digits aren't a number to hide.
const AMOUNT = /\d{1,3}(?:\.\d{3})+,\d+/g;

// The texts sent from each page.
const sentTexts = (content: ExtractedContent): string[][] => {
  const minimized = minimizeCardPdf(content);
  if (minimized.type !== "pdf") throw new Error("Not a PDF");
  return minimized.pages.map(({ items }) => items.map(({ str }) => str));
};

describe("minimizeCardPdf", () => {
  it.each(CARDS)(
    "parses %s's minimized content as the original",
    (_, content) => {
      expect(bancolombiaCardPdfParser.parse(minimizeCardPdf(content))).toEqual(
        bancolombiaCardPdfParser.parse(content),
      );
    },
  );

  it.each(CARDS)("minimizes %s once and for all", (_, content) => {
    const minimized = minimizeCardPdf(content);

    expect(minimizeCardPdf(minimized)).toEqual(minimized);
    expect(bancolombiaCardPdfParser.canParse(minimized)).toBe(true);
  });

  it("keeps a line in a table that isn't a movement, masked, so it warns the same", () => {
    const [, basic] = CARDS[0] ?? [];
    if (basic === undefined) throw new Error("No basic PDF");
    const stray = {
      str: "SUBTOTAL 1234567",
      x: 158,
      y: 318,
      width: 67.2,
      height: 7,
    };
    const content: PdfContent = {
      type: "pdf",
      pages: basic.pages.map((page, index) =>
        index === 1 ? { items: [...page.items, stray] } : page,
      ),
    };
    const minimized = bancolombiaCardPdfParser.parse(minimizeCardPdf(content));

    expect(minimized).toEqual(bancolombiaCardPdfParser.parse(content));
    expect(minimized.ok && minimized.value.warnings).toEqual([
      { code: "UNEXPECTED_ROW", sourceRow: 3 },
    ]);
    expect(sentTexts(content).flat()).toContain("SUBTOTAL ***4567");
  });

  it("sends neither the address, the city or the department, nor the authorizations, the debt or the footers, nor any rate but the monthly one for purchases", () => {
    const sent = sentTexts(fixtureContent(cardDollarsPdf)).flat();

    for (const text of [
      "CALLE 10 # 20-30 APTO 101",
      "MEDELLIN (ANTIOQUIA)",
      "ANTIOQUIA",
      "Tasas de Interés vigente",
      "Compra a una cuota",
      "Avances",
      "25.3400%",
      "25,3400 %",
      "C01234",
      "Tarjeta: *********1234",
      "Deuda a la fecha de corte:",
      "$3.284.501,00",
      "Detalles del movimiento",
    ]) {
      expect(sent).not.toContain(text);
    }
    expect(sent.some((text) => text.startsWith("DCF:"))).toBe(false);
    expect(sent).toContain("ANA MARIA PRUEBA GOMEZ");
    expect(sent).toContain("Información de la Tarjeta *1234");
    expect(sent).toContain("Compra 2 - 36 cuotas");
    expect(sent.filter((text) => text === "1.9000%")).toHaveLength(1);
  });

  it("sends a text drawn over itself once, and no long number, its descriptions' masked", () => {
    const sent = sentTexts(fixtureContent(cardBasicPdf)).flat();

    expect(sent.filter((text) => text === "Moneda: PESOS")).toHaveLength(1);
    expect(LONG_NUMBER.test(sent.join("\n").replaceAll(AMOUNT, ""))).toBe(
      false,
    );
    expect(sent).toContain("TIENDA EJEMPLO *****6789");
  });

  it("keeps of the pages in dollars only their currency, their tables' titles and headers, and their movements' dates", () => {
    const [, , header, movements] = sentTexts(fixtureContent(cardDollarsPdf));

    expect(header).toEqual(["Moneda: DOLARES"]);
    expect(movements).toEqual([
      "ESTADO DE CUENTA EN:",
      "DOLARES",
      "Nuevos movimientos entre 31 ago hasta 30 sep. 2026",
      "Número de",
      "autorización",
      "Fecha",
      "Movimientos",
      "Valor",
      "movimiento",
      "Número",
      "cuotas",
      "Valor",
      "Couta/Abono",
      "% Interés",
      "mensual",
      "% Interés",
      "anual",
      "Saldo",
      "pendiente",
      "21/09/2026",
      "12/09/2026",
    ]);
  });

  it("returns content it doesn't recognize as it was", () => {
    const spreadsheet = fixtureContent(cardBasic);

    expect(minimizeCardPdf(spreadsheet)).toBe(spreadsheet);
  });
});
