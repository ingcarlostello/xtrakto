import { describe, expect, it } from "vitest";
import type { ExtractedContent, PdfContent, PdfTextItem } from "@xtrakto/core";
import cardBasic from "../../fixtures/card-basic.json";
import cardBasicPdf from "../../fixtures/card-basic-pdf.json";
import { fixtureContent } from "../../fixtures/fixture.utils";
import movementsBasicPdf from "../../fixtures/movements-basic-pdf.json";
import nuCardBasicPdf from "../../fixtures/nu-card-basic-pdf.json";
import nuCardBrokenPdf from "../../fixtures/nu-card-broken-pdf.json";
import nuCardLatePdf from "../../fixtures/nu-card-late-pdf.json";
import { contentToPdf } from "../../fixtures/pdf-writer.mjs";
import quarterlyBasicPdf from "../../fixtures/quarterly-basic-pdf.json";
import { extractPdf } from "../extraction/pdf-extraction.helpers";
import { RECONCILIATION_ISSUE } from "../reconciliation/reconciliation.constants";
import { reconcile } from "../reconciliation/reconciliation.helpers";
import { DEFAULT_PARSERS } from "../registry/default-registry.helpers";
import { nuCardPdfParser } from "./nu-card-parser.helpers";

// Invented, as the fixtures' README says: a document number's shape.
const PASSWORD = "1020304050";

const pdfOf = (fixture: unknown): PdfContent => {
  const content = fixtureContent(fixture);
  if (content.type !== "pdf") throw new Error("Not a PDF fixture.");
  return content;
};

const BASIC = pdfOf(nuCardBasicPdf);
const LATE = pdfOf(nuCardLatePdf);

const parsed = (content: ExtractedContent) => {
  const statement = nuCardPdfParser.parse(content);
  if (!statement.ok) throw new Error(JSON.stringify(statement.error));
  return statement.value;
};

const failureOf = (content: ExtractedContent) => {
  const statement = nuCardPdfParser.parse(content);
  return statement.ok ? undefined : statement.error.details;
};

// A PDF with each item `change` returns, or without it.
const changed = (
  content: PdfContent,
  change: (item: PdfTextItem) => PdfTextItem | undefined,
): PdfContent => ({
  type: "pdf",
  pages: content.pages.map(({ items }) => ({
    items: items.flatMap((item) => {
      const kept = change(item);
      return kept === undefined ? [] : [kept];
    }),
  })),
});

// The basic PDF with a text saying another, as wide as its characters take.
const replaced = (from: string, to: string) =>
  changed(BASIC, (item) =>
    item.str === from
      ? { ...item, str: to, width: (item.width * to.length) / from.length }
      : item,
  );

// A movement as the parser gives it: its date, text and amount in Xtrakto's
// signs, its line, and its installment as [number, count, monthly, rate,
// remaining].
const movement = (
  [date, text, amountMinor]: readonly [string, string, number],
  sourceRow: number,
  installment?: readonly [number, number, number, number, number],
) => ({
  date,
  descriptionRaw: text,
  descriptionNormalized: text,
  amountMinor,
  ...(installment === undefined
    ? {}
    : {
        installment: {
          number: installment[0],
          count: installment[1],
          monthlyMinor: installment[2],
          monthlyRatePpm: installment[3],
          remainingMinor: installment[4],
        },
      }),
  sourceRow,
});

describe("nuCardPdfParser", () => {
  it("reads the holder, the physical card, the dates, the limits and the summary", () => {
    expect(parsed(BASIC)).toMatchObject({
      bankId: "nu",
      formatId: "nu-credit-card-pdf",
      accountType: "credit_card",
      accountLast4: "1234",
      currency: "COP",
      period: { from: "2026-08-12", to: "2026-09-10" },
      periodSource: "statement",
      holderName: "Ana Maria Prueba Gomez",
      card: {
        creditLimitMinor: 500_000_000,
        availableMinor: 364_586_300,
        minimumPaymentMinor: 413_700,
        totalPaymentMinor: 135_413_700,
        dueDate: "2026-10-04",
        cutDate: "2026-09-11",
        summary: {
          kind: "nu",
          dueThisMonthMinor: 26_830_000,
          interestMinor: 3_485_000,
          advanceFeesMinor: 0,
          serviceFeesMinor: 0,
          conversionChargesMinor: 98_700,
          paymentsToMinimumMinor: 30_000_000,
          refundsMinor: 0,
          paymentsToTotalMinor: 20_000_000,
          remainingDebtMinor: 155_000_000,
        },
      },
      warnings: [],
    });
  });

  it("reads the month's interest on the period's last day, then each row: a payment, purchases with their installments, a conversion charge of its own", () => {
    expect(parsed(BASIC).transactions).toEqual([
      movement(["2026-09-10", "Intereses", -3_485_000], 7),
      movement(
        ["2026-09-08", "Supermercado Central", -8_540_000],
        0,
        [1, 1, 8_540_000, 0, 0],
      ),
      movement(["2026-09-05", "Gracias por tu pago", 50_000_000], 2),
      movement(
        ["2026-08-28", "App de Musica", -3_290_000],
        4,
        [1, 1, 3_290_000, 0, 0],
      ),
      movement(["2026-08-28", "Comisión por cambio de moneda", -98_700], 6),
      // Its long number masked (ADR 0012).
      movement(
        ["2026-08-20", "Pedido *****6789", -120_000_000],
        7,
        [1, 24, 5_000_000, 20_500, 115_000_000],
      ),
      movement(
        ["2026-07-15", "Almacen Ropa", -60_000_000],
        9,
        [2, 6, 10_000_000, 20_500, 40_000_000],
      ),
    ]);
  });

  it("reads late interest as a movement of its own, a date on one line and a payment's parts marked •, its minimum on the next page", () => {
    const statement = parsed(LATE);

    expect(statement.transactions).toEqual([
      movement(["2026-10-10", "Intereses de mora", -125_000], 8),
      movement(["2026-10-10", "Intereses", -3_177_500], 4),
      movement(
        ["2026-10-02", "Restaurante El Patio", -9_000_000],
        0,
        [1, 1, 9_000_000, 0, 0],
      ),
      movement(["2026-09-28", "Gracias por tu pago", 50_000_000], 2),
      movement(
        ["2026-08-20", "Pedido *****6789", -120_000_000],
        4,
        [2, 24, 5_000_000, 20_500, 110_000_000],
      ),
      // "mora" under its late interest isn't its description's.
      movement(
        ["2026-07-15", "Almacen Ropa", -60_000_000],
        6,
        [3, 6, 10_000_000, 20_500, 30_000_000],
      ),
    ]);
    expect(statement.warnings).toEqual([]);
    expect(statement.card?.summary).toMatchObject({
      lateInterestMinor: 125_000,
    });
  });

  it("reconciles a month whose sums hold, and finds a conversion charge misprinted", () => {
    expect(reconcile(parsed(BASIC)).issues).toEqual([]);
    expect(reconcile(parsed(LATE)).issues).toEqual([]);
    expect(reconcile(parsed(fixtureContent(nuCardBrokenPdf))).issues).toEqual([
      { code: RECONCILIATION_ISSUE.CARD_CONVERSION },
    ]);
  });

  it("reads a statement written to a real PDF, locked with its password, as from its text items", async () => {
    const bytes = await contentToPdf(BASIC, { userPassword: PASSWORD });
    const extracted = await extractPdf(bytes, { password: PASSWORD });

    expect(extracted.ok && nuCardPdfParser.parse(extracted.value)).toEqual(
      nuCardPdfParser.parse(BASIC),
    );
  });

  it.each([
    ["an amount's column", "SUBTOTAL", 150],
    ["the date's, which isn't a year", "TOTAL", 30],
  ])(
    "warns of a line in the table that isn't a movement, in %s",
    (_, str, x) => {
      const [front, movements, ...rest] = BASIC.pages;
      if (front === undefined || movements === undefined) {
        throw new Error("Missing pages");
      }
      const stray = { str, x, y: 120, width: str.length * 3.6, height: 6 };
      const content: PdfContent = {
        type: "pdf",
        pages: [front, { items: [...movements.items, stray] }, ...rest],
      };

      expect(parsed(content).warnings).toEqual([
        { code: "UNEXPECTED_ROW", sourceRow: 2 },
      ]);
    },
  );

  it("reads no movement when the statement prints no table", () => {
    const content = changed(BASIC, (item) =>
      item.str === "Descripción" ? undefined : item,
    );

    expect(parsed(content).transactions).toEqual([]);
  });

  it.each([
    [
      "the summary's title",
      replaced("Resumen de tu extracto", "Resumen"),
      { reason: "missing_block", block: "Resumen de tu extracto" },
    ],
    [
      "the holder's name beside the cards",
      changed(BASIC, (item) =>
        item.str === "Ana Maria Prueba Gomez" ? undefined : item,
      ),
      { reason: "missing_value", block: "Tus tarjetas" },
    ],
    [
      "the physical card's number",
      replaced("• • • • 1234", "• • 12"),
      { reason: "invalid_value", block: "Tarjeta física" },
    ],
    [
      "a summary's line",
      replaced("Deuda restante", "Deuda"),
      { reason: "missing_value", column: "Deuda restante" },
    ],
    [
      "a summary's amount that reads",
      replaced("$268.300,00", "mucho"),
      { reason: "invalid_value", column: "Deuda a pagar este mes" },
    ],
    [
      "the header's columns",
      replaced("Porcentaje y valor", "Porcentaje"),
      {
        reason: "missing_column",
        column: "Interés del mes Porcentaje y valor",
      },
    ],
    [
      "an installment within its count",
      replaced("1 de 24", "25 de 24"),
      { reason: "invalid_value", column: "Cuotas", row: 7 },
    ],
    [
      "a movement's date",
      replaced("08 SEP", "31 FEB"),
      { reason: "invalid_value", column: "Fecha", row: 0 },
    ],
    [
      "a rate that reads",
      replaced("2.05%", "dos%"),
      {
        reason: "invalid_value",
        column: "Interés del mes Porcentaje y valor",
        row: 7,
      },
    ],
  ])("fails without %s, naming where", (_, content, failure) => {
    expect(failureOf(content)).toMatchObject(failure);
  });

  it("fails on a spreadsheet's content", () => {
    expect(failureOf(fixtureContent(cardBasic))).toEqual({
      reason: "content_type",
    });
  });

  it("recognizes only Nu's statements, which no registered parser does", () => {
    const others = [quarterlyBasicPdf, movementsBasicPdf, cardBasicPdf].map(
      fixtureContent,
    );
    const nu = [nuCardBasicPdf, nuCardLatePdf, nuCardBrokenPdf].map(
      fixtureContent,
    );

    expect(others.some(nuCardPdfParser.canParse)).toBe(false);
    expect(nu.every(nuCardPdfParser.canParse)).toBe(true);
    expect(
      nu.some((card) =>
        DEFAULT_PARSERS.some((parser) => parser.canParse(card)),
      ),
    ).toBe(false);
  });
});
