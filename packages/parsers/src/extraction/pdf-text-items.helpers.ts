import type { PdfContent, PdfTextItem } from "@xtrakto/core";

type PdfPage = PdfContent["pages"][number];

/** The fields of a pdf.js text item that the extraction reads. */
export type PdfjsTextItem = {
  readonly str: string;
  /** Its text matrix in the page's PDF space: `[a, b, c, d, e, f]`. */
  readonly transform: readonly number[];
  readonly width: number;
  readonly height: number;
};

/** pdf.js's marked content, which comes among the text items when asked for. */
type PdfjsMarkedContent = { readonly type: string };

type Matrix = readonly [number, number, number, number, number, number];

// Text whose matrix turns it by more than this is rotated, not upright.
const SKEW_TOLERANCE = 0.01;

// A hundredth of a point is far finer than any gap between a statement's
// columns, and shorter numbers weigh less to send. `|| 0` drops a negative
// zero.
const round = (value: number): number => Math.round(value * 100) / 100 || 0;

const asMatrix = (values: readonly number[]): Matrix | undefined => {
  if (values.length !== 6 || !values.every(Number.isFinite)) return undefined;
  const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0] = values;
  return [a, b, c, d, e, f];
};

// The product pdf.js's `Util.transform` computes: `inner` mapped by `outer`.
const multiply = (outer: Matrix, inner: Matrix): Matrix => {
  const [a1, b1, c1, d1, e1, f1] = outer;
  const [a2, b2, c2, d2, e2, f2] = inner;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
};

// Upright on the page: no rotation, and neither mirrored nor upside down
// (the viewport turns the page's y axis down).
const isUpright = ([a, b, c, d]: Matrix): boolean =>
  Math.abs(b) <= SKEW_TOLERANCE &&
  Math.abs(c) <= SKEW_TOLERANCE &&
  a > 0 &&
  d < 0;

const isTextItem = (
  item: PdfjsTextItem | PdfjsMarkedContent,
): item is PdfjsTextItem => "str" in item;

/**
 * The item as the extracted content keeps it, or `undefined` for blank text
 * and text that isn't upright. `viewport` is the page's viewport transform at
 * scale 1, so `x` is where the text starts and `y` its baseline, both from the
 * page's top left. Letters written apart are joined (NFC), as the bank's
 * spreadsheets write them.
 */
const toPdfTextItem = (
  item: PdfjsTextItem,
  viewport: Matrix,
): PdfTextItem | undefined => {
  const str = item.str.normalize("NFC");
  const transform = asMatrix(item.transform);
  if (str.trim() === "" || transform === undefined) return undefined;
  const placed = multiply(viewport, transform);
  if (!isUpright(placed)) return undefined;
  const [, , , , x, y] = placed;
  return {
    str,
    x: round(x),
    y: round(y),
    width: round(item.width),
    height: round(item.height),
  };
};

/**
 * A page of the extracted content from pdf.js's text items and the page's
 * viewport transform at scale 1. Marked content, blank text and text that
 * isn't upright (a rotated stamp, say) are left out.
 */
export const toPdfPage = (
  items: readonly (PdfjsTextItem | PdfjsMarkedContent)[],
  viewportTransform: readonly number[],
): PdfPage => {
  const viewport = asMatrix(viewportTransform);
  if (viewport === undefined) return { items: [] };
  return {
    items: items.filter(isTextItem).flatMap((item) => {
      const textItem = toPdfTextItem(item, viewport);
      return textItem === undefined ? [] : [textItem];
    }),
  };
};
