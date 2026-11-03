import { describe, expect, it } from "vitest";
import { APP_ERROR_CODE, err } from "@xtrakto/core";
import type {
  ExtractedContent,
  ParsedStatement,
  PdfContent,
  PdfTextItem,
  Result,
} from "@xtrakto/core";
import { fixtureContent } from "../../fixtures/fixture.utils";
import { contentToPdf } from "../../fixtures/pdf-writer.mjs";
import quarterlyBasic from "../../fixtures/quarterly-basic.json";
import quarterlyBasicPdf from "../../fixtures/quarterly-basic-pdf.json";
import quarterlyLarge from "../../fixtures/quarterly-large.json";
import quarterlyLargePdf from "../../fixtures/quarterly-large-pdf.json";
import { extractPdf } from "../extraction/pdf-extraction.helpers";
import { bancolombiaQuarterlyParser } from "./quarterly-parser.helpers";
import { bancolombiaQuarterlyPdfParser } from "./quarterly-pdf-parser.helpers";

const pdfOf = (fixture: unknown): PdfContent => {
  const content = fixtureContent(fixture);
  if (content.type !== "pdf") throw new Error("Not a PDF fixture.");
  return content;
};

const BASIC_PDF = pdfOf(quarterlyBasicPdf);

// A statement without what tells its formats apart: its format's id, where
// each movement sits in its file, and the second of two spaces in a row in a
// description, which the PDF prints as one.
const comparable = (result: Result<ParsedStatement>) =>
  result.ok
    ? {
        ...result.value,
        formatId: "",
        transactions: result.value.transactions.map((transaction) => ({
          ...transaction,
          descriptionRaw: transaction.descriptionRaw.replace(/ {2,}/g, " "),
          sourceRow: 0,
        })),
      }
    : result;

// The basic PDF with its items changed: each one `change` returns, or none.
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

const without = (str: string) =>
  changed((item) => (item.str === str ? undefined : item));

const failure = (details: Record<string, string>) =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details });

const parse = (content: ExtractedContent) =>
  bancolombiaQuarterlyPdfParser.parse(content);

describe("bancolombiaQuarterlyPdfParser", () => {
  it.each([
    { name: "basic", pdf: quarterlyBasicPdf, spreadsheet: quarterlyBasic },
    { name: "large", pdf: quarterlyLargePdf, spreadsheet: quarterlyLarge },
  ])(
    "reads the $name statement's PDF as its spreadsheet, every field but where each movement sits",
    ({ pdf, spreadsheet }) => {
      const fromPdf = parse(fixtureContent(pdf));
      const fromSpreadsheet = bancolombiaQuarterlyParser.parse(
        fixtureContent(spreadsheet),
      );

      expect(fromPdf).toMatchObject({
        ok: true,
        value: { formatId: "bancolombia-savings-quarterly-pdf", warnings: [] },
      });
      expect(fromSpreadsheet.ok).toBe(true);
      expect(comparable(fromPdf)).toEqual(comparable(fromSpreadsheet));
    },
  );

  it("reads a statement written to a real PDF as from its text items", async () => {
    const extracted = await extractPdf(await contentToPdf(BASIC_PDF));

    expect(extracted.ok && parse(extracted.value)).toEqual(parse(BASIC_PDF));
  });

  it("recognizes only a quarterly statement's PDF", () => {
    expect(bancolombiaQuarterlyPdfParser.canParse(BASIC_PDF)).toBe(true);
    expect(
      bancolombiaQuarterlyPdfParser.canParse(fixtureContent(quarterlyBasic)),
    ).toBe(false);
    expect(bancolombiaQuarterlyParser.canParse(BASIC_PDF)).toBe(false);
    expect(bancolombiaQuarterlyPdfParser.canParse(without("SALDO"))).toBe(
      false,
    );
  });

  it("restores the ñí the PDF prints as |¡ inside a description", () => {
    const content = changed((item) =>
      item.str === "Ejemplo" ? { ...item, str: "Compa|¡" } : item,
    );
    const statement = parse(content);

    expect(
      statement.ok &&
        statement.value.transactions.some(({ descriptionRaw }) =>
          descriptionRaw.includes("Compañí"),
        ),
    ).toBe(true);
  });

  it.each<{
    label: string;
    content: () => ExtractedContent;
    details: Record<string, string>;
  }>([
    {
      label: "without the period's start",
      content: () => without("DESDE:"),
      details: {
        reason: "missing_value",
        block: "ESTADO DE CUENTA",
        column: "DESDE:",
      },
    },
    {
      label: "without the account's number",
      content: () => without("NÚMERO"),
      details: {
        reason: "missing_value",
        block: "ESTADO DE CUENTA",
        column: "NÚMERO",
      },
    },
    {
      label:
        "without the holder's block, never taking a summary's label for the name",
      content: () =>
        changed((item) =>
          item.x < 325 && item.y > 100 && item.y < 160 ? undefined : item,
        ),
      details: {
        reason: "missing_value",
        block: "ESTADO DE CUENTA",
        column: "CLIENTE",
      },
    },
    {
      label:
        "without its account type, never taking the summary's CUENTAS X COBRAR for it",
      content: () => changed((item) => (item.y === 108 ? undefined : item)),
      details: {
        reason: "missing_value",
        block: "ESTADO DE CUENTA",
        column: "CUENTA",
      },
    },
    {
      label: "for another type of account",
      content: () =>
        changed((item) =>
          item.str === "AHORROS" && item.y < 120
            ? { ...item, str: "CORRIENTE" }
            : item,
        ),
      details: {
        reason: "unsupported_account_type",
        block: "ESTADO DE CUENTA",
        column: "CUENTA",
      },
    },
    {
      label: "without one of the summary's figures",
      content: () => without("RETEFUENTE"),
      details: {
        reason: "missing_value",
        block: "RESUMEN",
        column: "RETEFUENTE",
      },
    },
    {
      label: "without the movements table",
      content: () => without("DCTO."),
      details: { reason: "missing_block", block: "Movimientos:" },
    },
    {
      label: "without its end marker",
      content: () => without("FIN"),
      details: { reason: "missing_end", block: "Movimientos:" },
    },
  ])("fails a statement $label", ({ content, details }) => {
    expect(parse(content())).toEqual(failure(details));
  });

  it("fails content that isn't a PDF", () => {
    expect(parse(fixtureContent(quarterlyBasic))).toEqual(
      failure({ reason: "content_type" }),
    );
  });
});
