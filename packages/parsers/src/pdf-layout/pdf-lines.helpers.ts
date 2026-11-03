import type { PdfContent, PdfTextItem } from "@xtrakto/core";
import type { PdfLine, PdfSegment } from "./pdf-layout.types";

// Items share a line when their baselines are closer than this share of the
// text's height: a bold label and its value can sit a little apart.
const LINE_TOLERANCE = 0.5;
// A gap of more characters than this ends a segment: it parts one column's
// cell from the next one's. A statement's text has at most two spaces in a row.
const SEGMENT_GAP = 2.5;
// A gap under this share of a character joins two items without a space, as
// in a word whose font changes partway.
const TOUCHING_GAP = 0.2;

type Segment = {
  text: string;
  left: number;
  right: number;
  items: PdfTextItem[];
};

// A character's width in the item: a space's in a monospace font such as the
// quarterly statement's, about one and a half spaces' in others.
const characterWidth = ({ str, width, height }: PdfTextItem): number =>
  width > 0 && str.length > 0 ? width / str.length : height / 2;

// The spaces a gap holds, at least one once it isn't touching.
const spacesFor = (gap: number, character: number): string =>
  gap <= TOUCHING_GAP * character
    ? ""
    : " ".repeat(Math.max(1, Math.round(gap / character)));

// A line's items, left to right, joined into segments.
const toSegments = (items: readonly PdfTextItem[]): PdfSegment[] => {
  const segments: Segment[] = [];
  let character = 0;
  for (const item of items) {
    const last = segments.at(-1);
    const gap = last === undefined ? Infinity : item.x - last.right;
    if (last !== undefined && gap <= SEGMENT_GAP * character) {
      last.text += spacesFor(gap, character) + item.str;
      last.right = Math.max(last.right, item.x + item.width);
      last.items.push(item);
    } else {
      segments.push({
        text: item.str,
        left: item.x,
        right: item.x + item.width,
        items: [item],
      });
    }
    character = characterWidth(item);
  }
  return segments.map((segment) => ({ ...segment, text: segment.text.trim() }));
};

// Items by baseline, each joining the line of the item above while it stays
// within the tolerance of that line's first baseline.
const groupByBaseline = (items: readonly PdfTextItem[]): PdfTextItem[][] => {
  const groups: PdfTextItem[][] = [];
  for (const item of items.toSorted((a, b) => a.y - b.y || a.x - b.x)) {
    const group = groups.at(-1);
    const first = group?.[0];
    const tolerance =
      LINE_TOLERANCE * Math.max(item.height, first?.height ?? 0);
    if (
      group !== undefined &&
      first !== undefined &&
      item.y - first.y <= tolerance
    ) {
      group.push(item);
    } else {
      groups.push([item]);
    }
  }
  return groups;
};

const toLine = (items: readonly PdfTextItem[], page: number): PdfLine => ({
  page,
  y: Math.min(...items.map(({ y }) => y)),
  height: Math.max(...items.map(({ height }) => height)),
  segments: toSegments(items.toSorted((a, b) => a.x - b.x)),
});

/**
 * The lines of every page, in reading order: page after page, top to bottom,
 * whatever order the PDF wrote its text in. Each line joins its items into
 * segments, the text that sits together, with the spaces their gaps hold.
 */
export const pdfLines = (content: PdfContent): readonly PdfLine[] =>
  content.pages.flatMap(({ items }, page) =>
    groupByBaseline(items).map((group) => toLine(group, page)),
  );
