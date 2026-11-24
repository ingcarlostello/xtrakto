import { describe, expect, it } from "vitest";
import type {
  ExtractedContent,
  ParsedStatement,
  PdfContent,
  PdfTextItem,
  Result,
} from "@xtrakto/core";
import cardBasic from "../../fixtures/card-basic.json";
import cardBasicPdf from "../../fixtures/card-basic-pdf.json";
import cardBroken from "../../fixtures/card-broken.json";
import cardBrokenPdf from "../../fixtures/card-broken-pdf.json";
import cardDollars from "../../fixtures/card-dollars.json";
import cardDollarsPdf from "../../fixtures/card-dollars-pdf.json";
import { fixtureContent } from "../../fixtures/fixture.utils";
import movementsBasicPdf from "../../fixtures/movements-basic-pdf.json";
import { contentToPdf } from "../../fixtures/pdf-writer.mjs";
import quarterlyBasicPdf from "../../fixtures/quarterly-basic-pdf.json";
import { extractPdf } from "../extraction/pdf-extraction.helpers";
import { DEFAULT_PARSERS } from "../registry/default-registry.helpers";
import { bancolombiaCardParser } from "./card-parser.helpers";
import { bancolombiaCardPdfParser } from "./card-pdf-parser.helpers";

const pdfOf = (fixture: unknown): PdfContent => {
  const content = fixtureContent(fixture);
  if (content.type !== "pdf") throw new Error("Not a PDF fixture.");
  return content;
};

const BASIC_PDF = pdfOf(cardBasicPdf);

// A statement without what tells its formats apart: its format's id, and
// where each movement sits in its file.
const comparable = (result: Result<ParsedStatement>) =>
  result.ok
    ? {
        ...result.value,
        formatId: "",
        transactions: result.value.transactions.map((transaction) => ({
          ...transaction,
          sourceRow: 0,
        })),
      }
    : result;

// The basic PDF with each item `change` returns, or without it.
const changed = (
  change: (item: PdfTextItem) => PdfTextItem | undefined,
): ExtractedContent => ({
  type: "pdf",
  pages: BASIC_PDF.pages.map(({ items }) => ({
    items: items.flatMap((item) => {
      const kept = change(item);
      return kept === undefined ? [] : [kept];
    }),
  })),
});

// The basic PDF with every text `from` says, bold copies too, saying `to`,
// as wide as its characters take.
const replaced = (...pairs: readonly (readonly [string, string])[]) =>
  changed((item) => {
    const [, to] = pairs.find(([from]) => from === item.str) ?? [];
    return to === undefined
      ? item
      : { ...item, str: to, width: (item.width * to.length) / item.str.length };
  });

const parse = (content: ExtractedContent) =>
  bancolombiaCardPdfParser.parse(content);

const failureOf = (content: ExtractedContent) => {
  const statement = parse(content);
  return statement.ok ? undefined : statement.error.details;
};

describe("bancolombiaCardPdfParser", () => {
  it.each([
    { name: "basic", pdf: cardBasicPdf, spreadsheet: cardBasic },
    { name: "dollars", pdf: cardDollarsPdf, spreadsheet: cardDollars },
    { name: "broken", pdf: cardBrokenPdf, spreadsheet: cardBroken },
  ])(
    "reads the $name statement's PDF as its spreadsheet, every field but where each movement sits",
    ({ pdf, spreadsheet }) => {
      const fromPdf = parse(fixtureContent(pdf));
      const fromSpreadsheet = bancolombiaCardParser.parse(
        fixtureContent(spreadsheet),
      );

      expect(fromPdf).toMatchObject({
        ok: true,
        value: { formatId: "bancolombia-credit-card-pdf" },
      });
      expect(fromSpreadsheet.ok).toBe(true);
      expect(comparable(fromPdf)).toEqual(comparable(fromSpreadsheet));
    },
  );

  it("reads a statement written to a real PDF, its bold drawn three times, as from its text items", async () => {
    const extracted = await extractPdf(await contentToPdf(BASIC_PDF));

    expect(extracted.ok && parse(extracted.value)).toEqual(parse(BASIC_PDF));
  });

  it("reads nothing due when the date is dashes, and a period across New Year", () => {
    const statement = parse(
      replaced(
        ["oct. 15, 2026", "---"],
        ["31 ago - 30 sep. 2026", "16 dic - 15 ene. 2027"],
      ),
    );

    expect(statement).toMatchObject({
      ok: true,
      value: { period: { from: "2026-12-16", to: "2027-01-15" } },
    });
    expect(statement.ok && statement.value.card).not.toHaveProperty("dueDate");
  });

  it("reads a page that names no currency in the previous page's", () => {
    const unnamed = changed((item) =>
      ["ESTADO DE CUENTA EN:", "PESOS"].includes(item.str) ? undefined : item,
    );

    expect(parse(unnamed)).toEqual(parse(BASIC_PDF));
  });

  it("warns of a line in a table that isn't a movement, and not of the header's second line", () => {
    const [, movements] = BASIC_PDF.pages;
    const stray = {
      str: "SUBTOTAL",
      x: 175,
      y: 318,
      width: 33.6,
      height: 7,
    };
    const content: PdfContent = {
      type: "pdf",
      pages: BASIC_PDF.pages.map((page) =>
        page === movements ? { items: [...page.items, stray] } : page,
      ),
    };
    const statement = parse(content);

    expect(statement.ok && statement.value.warnings).toEqual([
      { code: "UNEXPECTED_ROW", sourceRow: 3 },
    ]);
    expect(statement.ok && statement.value.transactions).toHaveLength(9);
  });

  it("counts only the movements of the pages in dollars, not a line among them that isn't one", () => {
    const dollars = pdfOf(cardDollarsPdf);
    const stray = { str: "SUBTOTAL", x: 175, y: 268, width: 33.6, height: 7 };
    const statement = parse({
      type: "pdf",
      pages: dollars.pages.map(({ items }, index) => ({
        items: index === 3 ? [...items, stray] : items,
      })),
    });

    expect(statement.ok && statement.value.warnings).toEqual([
      { code: "FOREIGN_CURRENCY" },
      { code: "FOREIGN_CURRENCY" },
    ]);
  });

  it.each([
    [
      "pages in pesos",
      replaced(["Moneda: PESOS", "Moneda: EUROS"], ["PESOS", "EUROS"]),
      { reason: "missing_block", block: "Moneda:" },
    ],
    [
      "the holder's name under the bank's NIT",
      changed((item) => (item.str.startsWith("NIT:") ? undefined : item)),
      { reason: "missing_value", column: "Cliente" },
    ],
    [
      "the card's number",
      replaced([
        "Información de la Tarjeta *1234",
        "Información de la Tarjeta 1234 5678",
      ]),
      { reason: "invalid_value", block: "Información de la Tarjeta" },
    ],
    [
      "a minimum that reads",
      replaced(["$ 574.501,00", "mucho"]),
      { reason: "invalid_value", column: "Pago mínimo:" },
    ],
    [
      "the summaries' titles",
      replaced(["Resumen saldo total", "Resumen"]),
      { reason: "missing_block", block: "Resumen saldo total" },
    ],
    [
      "a summary's line",
      replaced(["Cargos", "Total"]),
      {
        reason: "missing_value",
        block: "Resumen saldo total",
        column: "Cargos",
      },
    ],
    [
      "the movements' header with its columns",
      replaced(["mensual", "mes"]),
      {
        reason: "missing_column",
        block: "Nuevos movimientos entre",
        column: "% Interés mensual",
      },
    ],
    [
      "an installment within its count",
      replaced(["1/12", "13/12"]),
      { reason: "invalid_value", column: "Número cuotas", row: 6 },
    ],
    [
      "a movement's date",
      replaced(["15/09/2026", "31/02/2026"]),
      { reason: "invalid_value", column: "Fecha", row: 3 },
    ],
  ])("fails without %s, naming where", (_, content, failure) => {
    expect(failureOf(content)).toMatchObject(failure);
  });

  it("fails on a spreadsheet's content", () => {
    expect(failureOf(fixtureContent(cardBasic))).toEqual({
      reason: "content_type",
    });
  });

  it("recognizes only card statements' PDFs, which no registered parser does", () => {
    const others = [quarterlyBasicPdf, movementsBasicPdf, cardBasic].map(
      fixtureContent,
    );
    const cards = [cardBasicPdf, cardDollarsPdf, cardBrokenPdf].map(
      fixtureContent,
    );

    expect(others.some(bancolombiaCardPdfParser.canParse)).toBe(false);
    expect(cards.every(bancolombiaCardPdfParser.canParse)).toBe(true);
    expect(
      cards.some((card) =>
        DEFAULT_PARSERS.some((parser) => parser.canParse(card)),
      ),
    ).toBe(false);
  });
});
