import { describe, expect, it } from "vitest";
import { APP_ERROR_CODE, MAX_PDF_PAGES, err, ok } from "@xtrakto/core";
import type { PdfContent, PdfTextItem } from "@xtrakto/core";
import { contentToPdf, scannedPdf } from "../../fixtures/pdf-writer.mjs";
import { extractPdf } from "./pdf-extraction.helpers";

// TextEncoder exists in Node and browsers; its type comes from libraries this
// package leaves out.
const { TextEncoder } = globalThis as unknown as {
  readonly TextEncoder: new () => { encode(text: string): Uint8Array };
};

// The writer sets text in Courier, whose characters take 0.6 of the font size.
const item = (
  str: string,
  [x, y]: readonly [number, number],
  height = 8,
): PdfTextItem => ({
  str,
  x,
  y,
  width: Math.round(str.length * 0.6 * height * 100) / 100,
  height,
});

const pdf = (...pages: (readonly PdfTextItem[])[]): PdfContent => ({
  type: "pdf",
  pages: pages.map((items) => ({ items: [...items] })),
});

const pages = (count: number): PdfContent =>
  pdf(...Array.from({ length: count }, () => [item("FECHA", [50, 100])]));

// Invented statement text, as the quarterly statement sets it.
const STATEMENT = pdf(
  [
    item("ESTADO", [50, 40], 12),
    item("15/07", [50, 100]),
    item("COMPRA", [100, 100]),
    item("-45,900.00", [400, 100]),
  ],
  [],
  [item("FIN", [100, 700])],
);
const PASSWORD = "clave-inventada";

describe("extractPdf", () => {
  it("reads each text item with where it starts and its baseline from the page's top left, its width and height", async () => {
    expect(await extractPdf(await contentToPdf(STATEMENT))).toEqual(
      ok(STATEMENT),
    );
  });

  it("leaves out the spaces between words", async () => {
    const bytes = await contentToPdf(pdf([item("COMPRA EN  XYZ", [100, 100])]));

    expect(await extractPdf(bytes)).toEqual(
      ok(
        pdf([
          item("COMPRA", [100, 100]),
          item("EN", [133.6, 100]),
          item("XYZ", [152.8, 100]),
        ]),
      ),
    );
  });

  it("leaves the caller's bytes as they were", async () => {
    const bytes = await contentToPdf(STATEMENT);
    const before = [...bytes];

    await extractPdf(bytes);

    expect([...bytes]).toEqual(before);
  });

  describe("an encrypted PDF", () => {
    it("asks for its password", async () => {
      const bytes = await contentToPdf(STATEMENT, { userPassword: PASSWORD });

      expect(await extractPdf(bytes)).toEqual(
        err({
          code: APP_ERROR_CODE.INVALID_INPUT,
          details: { reason: "password_required" },
        }),
      );
    });

    it("says when a password doesn't open it", async () => {
      const bytes = await contentToPdf(STATEMENT, { userPassword: PASSWORD });

      expect(await extractPdf(bytes, { password: "otra-clave" })).toEqual(
        err({
          code: APP_ERROR_CODE.INVALID_INPUT,
          details: { reason: "password_incorrect" },
        }),
      );
    });

    it("opens with its password", async () => {
      const bytes = await contentToPdf(STATEMENT, { userPassword: PASSWORD });

      expect(await extractPdf(bytes, { password: PASSWORD })).toEqual(
        ok(STATEMENT),
      );
    });
  });

  describe("errors", () => {
    it("says a PDF has no text, as a scanned statement", async () => {
      expect(await extractPdf(await scannedPdf(2))).toEqual(
        err({
          code: APP_ERROR_CODE.INVALID_INPUT,
          details: { reason: "no_text" },
        }),
      );
    });

    it(`reads up to ${MAX_PDF_PAGES} pages and refuses more`, async () => {
      const longest = pages(MAX_PDF_PAGES);

      expect(await extractPdf(await contentToPdf(longest))).toEqual(
        ok(longest),
      );
      expect(
        await extractPdf(await contentToPdf(pages(MAX_PDF_PAGES + 1))),
      ).toEqual(
        err({
          code: APP_ERROR_CODE.INVALID_INPUT,
          details: { reason: "too_many_pages" },
        }),
      );
    });

    it("refuses text over the bounds the server enforces", async () => {
      // A 1-point font, so all 501 characters fit on the page.
      const bytes = await contentToPdf(
        pdf([item("9".repeat(501), [10, 100], 1)]),
      );

      expect(await extractPdf(bytes)).toEqual(
        err({
          code: APP_ERROR_CODE.INVALID_INPUT,
          details: { reason: "too_large" },
        }),
      );
    });

    it("fails on a damaged PDF", async () => {
      const bytes = await contentToPdf(STATEMENT);

      expect(await extractPdf(bytes.subarray(0, bytes.length / 2))).toEqual(
        err({ code: APP_ERROR_CODE.PARSE_FAILED }),
      );
    });

    it("refuses a file that isn't a PDF", async () => {
      const bytes = new TextEncoder().encode("Fecha;Descripción;Valor");

      expect(await extractPdf(bytes)).toEqual(
        err({
          code: APP_ERROR_CODE.UNKNOWN_FORMAT,
          details: { reason: "file_type" },
        }),
      );
    });
  });
});
