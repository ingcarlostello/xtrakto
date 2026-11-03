import { describe, expect, it } from "vitest";
import type { PdfContent, PdfTextItem } from "@xtrakto/core";
import { pdfLines } from "./pdf-lines.helpers";

// Courier at 8 points: each character takes 4.8 points.
const CHARACTER = 4.8;

const item = (str: string, [x, y]: readonly [number, number]): PdfTextItem => ({
  str,
  x,
  y,
  width: str.length * CHARACTER,
  height: 8,
});

// Text as pdf.js gives a monospace statement: one item per word, each where
// it falls, the spaces between them left out.
const words = (text: string, [x, y]: readonly [number, number]) =>
  [...text.matchAll(/\S+/g)].map((match) =>
    item(match[0], [x + match.index * CHARACTER, y]),
  );

const pdf = (...pages: (readonly PdfTextItem[])[]): PdfContent => ({
  type: "pdf",
  pages: pages.map((items) => ({ items: [...items] })),
});

const texts = (content: PdfContent) =>
  pdfLines(content).map(({ page, segments }) => [
    page,
    ...segments.map(({ text }) => text),
  ]);

describe("pdfLines", () => {
  it("puts items whose baselines meet on one line, top to bottom and left to right, whatever order the PDF wrote them in", () => {
    const content = pdf([
      item("-45,900.00", [400, 100.3]),
      item("16/07", [50, 112]),
      item("15/07", [50, 100]),
      item("ABONO", [100, 111.8]),
      item("COMPRA", [100, 99.9]),
    ]);

    expect(texts(content)).toEqual([
      [0, "15/07", "COMPRA", "-45,900.00"],
      [0, "16/07", "ABONO"],
    ]);
  });

  it("joins a line's words with the spaces their gaps hold, two where the bank wrote two, keeping the items it joins", () => {
    const items = words("COMPRA EN  MERCADO XYZ", [123, 100]);
    const [line] = pdfLines(pdf(items));

    expect(line?.segments).toEqual([
      {
        text: "COMPRA EN  MERCADO XYZ",
        left: 123,
        right: 123 + 22 * CHARACTER,
        items,
      },
    ]);
  });

  it("joins items that touch without a space, and parts those a column apart", () => {
    const content = pdf([
      item("Compa", [123, 100]),
      item("ñía", [123 + 5 * CHARACTER, 100]),
      item("CANAL", [390, 100]),
    ]);

    expect(texts(content)).toEqual([[0, "Compañía", "CANAL"]]);
  });

  it("keeps the line's baseline, its tallest text and its page", () => {
    const content = pdf(
      [item("ESTADO", [50, 40])],
      [{ ...item("FECHA", [50, 100]), height: 9 }, item("1/07", [200, 100.2])],
    );

    expect(
      pdfLines(content).map(({ page, y, height }) => ({ page, y, height })),
    ).toEqual([
      { page: 0, y: 40, height: 8 },
      { page: 1, y: 100, height: 9 },
    ]);
  });
});
