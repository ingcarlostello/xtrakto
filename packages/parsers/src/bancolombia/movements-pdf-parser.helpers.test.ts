import { describe, expect, it } from "vitest";
import { APP_ERROR_CODE, err, PARSE_WARNING_CODE } from "@xtrakto/core";
import type {
  ExtractedContent,
  ParsedStatement,
  PdfContent,
  PdfTextItem,
  Result,
} from "@xtrakto/core";
import { fixtureContent } from "../../fixtures/fixture.utils";
import movementsBasic from "../../fixtures/movements-basic.json";
import movementsBasicPdf from "../../fixtures/movements-basic-pdf.json";
import movementsOverlap from "../../fixtures/movements-overlap.json";
import movementsOverlapPdf from "../../fixtures/movements-overlap-pdf.json";
import { contentToPdf } from "../../fixtures/pdf-writer.mjs";
import { extractPdf } from "../extraction/pdf-extraction.helpers";
import { bancolombiaMovementsExportParser } from "./movements-export-parser.helpers";
import { bancolombiaMovementsPdfParser } from "./movements-pdf-parser.helpers";

const pdfOf = (fixture: unknown): PdfContent => {
  const content = fixtureContent(fixture);
  if (content.type !== "pdf") throw new Error("Not a PDF fixture.");
  return content;
};

const BASIC_PDF = pdfOf(movementsBasicPdf);
const HEADER = "Movimientos: Cuentas";

// The movements without what tells the formats apart: where each sits in its
// file, and the second of two spaces in a row in a description, which the PDF
// prints as one.
const movementsOf = (result: Result<ParsedStatement>) =>
  result.ok
    ? result.value.transactions.map((transaction) => ({
        ...transaction,
        descriptionRaw: transaction.descriptionRaw.replace(/ {2,}/g, " "),
        sourceRow: 0,
      }))
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

const replaced = (str: string, by: string) =>
  changed((item) => (item.str === str ? { ...item, str: by } : item));

const failure = (details: Record<string, string | number>) =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details });

const parse = (content: ExtractedContent) =>
  bancolombiaMovementsPdfParser.parse(content);

const movementOf = (description: string) => {
  const statement = parse(BASIC_PDF);
  return statement.ok
    ? statement.value.transactions.find(
        ({ descriptionNormalized }) => descriptionNormalized === description,
      )
    : undefined;
};

describe("bancolombiaMovementsPdfParser", () => {
  it.each([
    { name: "basic", pdf: movementsBasicPdf, spreadsheet: movementsBasic },
    {
      name: "overlap",
      pdf: movementsOverlapPdf,
      spreadsheet: movementsOverlap,
    },
  ])(
    "reads the $name export's PDF as its spreadsheet, every movement where it was",
    ({ pdf, spreadsheet }) => {
      const fromPdf = parse(fixtureContent(pdf));
      const fromSpreadsheet = bancolombiaMovementsExportParser.parse(
        fixtureContent(spreadsheet),
      );

      expect(fromSpreadsheet.ok).toBe(true);
      expect(fromPdf).toMatchObject({
        ok: true,
        value: {
          formatId: "bancolombia-movements-export-pdf",
          period: fromSpreadsheet.ok ? fromSpreadsheet.value.period : {},
          periodSource: "rows",
        },
      });
      expect(movementsOf(fromPdf)).toEqual(movementsOf(fromSpreadsheet));
    },
  );

  it("names the account by its last 4 digits, and its holder, which the spreadsheet doesn't", () => {
    expect(parse(BASIC_PDF)).toMatchObject({
      ok: true,
      value: {
        accountType: "savings",
        accountLast4: "8901",
        holderName: "ANA MARIA PRUEBA GOMEZ",
      },
    });
  });

  it("reports each description it joined from two lines, at its movement's row", () => {
    const statement = parse(BASIC_PDF);
    const warned =
      statement.ok &&
      statement.value.warnings.map(
        ({ code, sourceRow }) =>
          `${code} ${statement.value.transactions.find((transaction) => transaction.sourceRow === sourceRow)?.descriptionNormalized}`,
      );

    expect(warned && warned.toSorted()).toEqual(
      [
        "PAGO INTERBANC EMPRESA EJEMPLO",
        "PAGO PSE EMPRESA DE ENERGIA",
        "PAGO QR TIENDA SIN CODIGO",
        "RETIRO CAJERO ATM PLAZA CENTR",
        "TRANSF A EMPRESA DE GAS DE CO",
      ].map((text) => `${PARSE_WARNING_CODE.WRAPPED_DESCRIPTION} ${text}`),
    );
  });

  it("reports nothing for a row whose only cell over two lines is its reference", () => {
    // The gas payment's description on one line; its reference stays on two.
    const content = changed((item) => {
      if (item.str === "DE CO") return undefined;
      return item.str === "TRANSF A EMPRESA DE GAS"
        ? { ...item, str: "TRANSF A GAS" }
        : item;
    });
    const statement = parse(content);
    const gas =
      statement.ok &&
      statement.value.transactions.find(
        ({ descriptionNormalized }) => descriptionNormalized === "TRANSF A GAS",
      );

    expect(gas).toMatchObject({ referenceRaw: "123456 1234567890 12345" });
    expect(
      statement.ok &&
        statement.value.warnings.some(
          ({ sourceRow }) => gas && sourceRow === gas.sourceRow,
        ),
    ).toBe(false);
  });

  it("joins a reference over two lines, and reads one printed as null as none", () => {
    expect(movementOf("TRANSF A EMPRESA DE GAS DE CO")).toMatchObject({
      referenceRaw: "123456 1234567890 12345",
      referenceKind: "code",
    });
    expect(movementOf("PAGO INTERBANC EMPRESA EJEMPLO")).toEqual(
      expect.not.objectContaining({ referenceRaw: expect.anything() }),
    );
    expect(movementOf("PAGO INTERBANC EMPRESA EJEMPLO")).toMatchObject({
      referenceKind: "none",
    });
  });

  it("reads a statement written to a real PDF as from its text items", async () => {
    const extracted = await extractPdf(await contentToPdf(BASIC_PDF));

    expect(extracted.ok && parse(extracted.value)).toEqual(parse(BASIC_PDF));
  });

  it("recognizes only a movements export's PDF", () => {
    expect(bancolombiaMovementsPdfParser.canParse(BASIC_PDF)).toBe(true);
    expect(
      bancolombiaMovementsPdfParser.canParse(fixtureContent(movementsBasic)),
    ).toBe(false);
    expect(bancolombiaMovementsExportParser.canParse(BASIC_PDF)).toBe(false);
    expect(bancolombiaMovementsPdfParser.canParse(without("Referencia"))).toBe(
      false,
    );
  });

  it.each<{
    label: string;
    content: () => ExtractedContent;
    details: Record<string, string | number>;
  }>([
    {
      label: "without its holder, never taking a title for the name",
      content: () => without("ANA MARIA PRUEBA GOMEZ"),
      details: { reason: "missing_value", block: HEADER, column: "CLIENTE" },
    },
    {
      label: "without its account type",
      content: () => without("Cuenta de Ahorros"),
      details: { reason: "missing_value", block: HEADER, column: "CUENTA" },
    },
    {
      label: "for another type of account",
      content: () => replaced("Cuenta de Ahorros", "Cuenta Corriente"),
      details: {
        reason: "unsupported_account_type",
        block: HEADER,
        column: "CUENTA",
      },
    },
    {
      label: "without the account's number",
      content: () => without("Ahorros 123 - 456789 - 01"),
      details: { reason: "missing_value", block: HEADER, column: "NÚMERO" },
    },
    {
      label: "with a date it can't read",
      content: () => replaced("07 oct 2026", "31 sep 2026"),
      details: {
        reason: "invalid_value",
        column: "Fecha",
        row: 1,
        cause: "format",
      },
    },
    {
      label: "with an amount it can't read",
      content: () => replaced("-$ 84.250,50", "-84.250,50"),
      details: {
        reason: "invalid_value",
        column: "Valor",
        row: 1,
        cause: "format",
      },
    },
    {
      label: "without movements",
      // The first page down to its table's titles.
      content: () => ({
        type: "pdf",
        pages: [
          {
            items: (BASIC_PDF.pages[0]?.items ?? []).filter(({ y }) => y < 260),
          },
        ],
      }),
      details: { reason: "no_movements" },
    },
  ])("fails a statement $label", ({ content, details }) => {
    expect(parse(content())).toEqual(failure(details));
  });

  it("fails content that isn't a PDF", () => {
    expect(parse(fixtureContent(movementsBasic))).toEqual(
      failure({ reason: "content_type" }),
    );
  });
});
