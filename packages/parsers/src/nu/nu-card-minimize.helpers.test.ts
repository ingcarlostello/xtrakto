import { describe, expect, it } from "vitest";
import type { ExtractedContent, PdfContent } from "@xtrakto/core";
import cardBasic from "../../fixtures/card-basic.json";
import { fixtureContent } from "../../fixtures/fixture.utils";
import nuCardBasicPdf from "../../fixtures/nu-card-basic-pdf.json";
import nuCardBrokenPdf from "../../fixtures/nu-card-broken-pdf.json";
import nuCardLatePdf from "../../fixtures/nu-card-late-pdf.json";
import { minimizeNuCard } from "./nu-card-minimize.helpers";
import { nuCardPdfParser } from "./nu-card-parser.helpers";

const pdfOf = (fixture: unknown): PdfContent => {
  const content = fixtureContent(fixture);
  if (content.type !== "pdf") throw new Error("Not a PDF fixture.");
  return content;
};

const CARDS = [
  ["nu-card-basic-pdf", nuCardBasicPdf],
  ["nu-card-late-pdf", nuCardLatePdf],
  ["nu-card-broken-pdf", nuCardBrokenPdf],
].map(([name, fixture]) => [name, pdfOf(fixture)] as const);

const LONG_NUMBER = /\d{6,}/;
// Amounts as Nu writes them, whose digits aren't a number to hide.
const AMOUNT = /\d{1,3}(?:\.\d{3})+,\d+/g;

// The texts sent from every page.
const sentTexts = (content: ExtractedContent): string[] => {
  const minimized = minimizeNuCard(content);
  if (minimized.type !== "pdf") throw new Error("Not a PDF");
  return minimized.pages.flatMap(({ items }) => items.map(({ str }) => str));
};

describe("minimizeNuCard", () => {
  it.each(CARDS)(
    "parses %s's minimized content as the original",
    (_, content) => {
      expect(nuCardPdfParser.parse(minimizeNuCard(content))).toEqual(
        nuCardPdfParser.parse(content),
      );
    },
  );

  it.each(CARDS)("minimizes %s once and for all", (_, content) => {
    const minimized = minimizeNuCard(content);

    expect(minimizeNuCard(minimized)).toEqual(minimized);
    expect(nuCardPdfParser.canParse(minimized)).toBe(true);
  });

  it("keeps a line in the table that isn't a movement, masked, so it warns the same", () => {
    const [, basic] = CARDS[0] ?? [];
    if (basic === undefined) throw new Error("No basic PDF");
    const stray = {
      str: "SUBTOTAL 1234567",
      x: 150,
      y: 120,
      width: 57.6,
      height: 6,
    };
    const content: PdfContent = {
      type: "pdf",
      pages: basic.pages.map((page, index) =>
        index === 1 ? { items: [...page.items, stray] } : page,
      ),
    };
    const minimized = nuCardPdfParser.parse(minimizeNuCard(content));

    expect(minimized).toEqual(nuCardPdfParser.parse(content));
    expect(minimized.ok && minimized.value.warnings).toEqual([
      { code: "UNEXPECTED_ROW", sourceRow: 2 },
    ]);
    expect(sentTexts(content)).toContain("SUBTOTAL ***4567");
  });

  it("sends neither the greeting, the ID number, the address or the virtual card, nor what was used or paid, a payment's parts, what a purchase pays this month, Nu's contact or the footers", () => {
    const sent = sentTexts(fixtureContent(nuCardBasicPdf));

    for (const text of [
      "Hola, Ana Maria",
      "Llegó tu extracto de Septiembre",
      "CC 1020304050",
      "Calle 10 # 20-30, apto 101, Medellín",
      "Tarjeta virtual",
      "• • • • 5678",
      "Usado",
      "$135.413.700,00",
      "Abonaste $500.000,00",
      "$300.000,00 a tu pago mínimo",
      "↪ A capital $480.000,00",
      "$74.600,00",
      "Pago mínimo",
      "¿Tienes preguntas sobre tu extracto?",
      "Nu Financiera",
      "NIT 900.000.000-1",
    ]) {
      expect(sent).not.toContain(text);
    }
    expect(sent).toContain("Ana Maria Prueba Gomez");
    expect(sent).toContain("• • • • 1234");
  });

  it("leaves no long number, its descriptions' masked", () => {
    const sent = sentTexts(fixtureContent(nuCardBasicPdf));

    expect(LONG_NUMBER.test(sent.join("\n").replaceAll(AMOUNT, ""))).toBe(
      false,
    );
    expect(sent).toContain("*****6789");
  });

  it("returns content it doesn't recognize as it was", () => {
    const spreadsheet = fixtureContent(cardBasic);

    expect(minimizeNuCard(spreadsheet)).toBe(spreadsheet);
  });
});
