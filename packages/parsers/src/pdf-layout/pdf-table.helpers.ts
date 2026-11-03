import { hasText } from "../sheets/sheet.utils";
import type { SheetRows } from "../sheets/sheet.utils";
import type {
  PdfLine,
  PdfSegment,
  PdfTable,
  PdfTableLayout,
  PdfTableLine,
} from "./pdf-layout.types";

type Span = { readonly left: number; readonly right: number };

/** A column: where its header sits, and the edges its cells line up on. */
type Column = {
  readonly header: Span;
  readonly left?: number;
  readonly right?: number;
};

type Edges = { readonly left?: number; readonly right?: number };

/** A page's part of the table: its header, one segment per column, and lines. */
type PageTable = {
  readonly page: number;
  readonly header: readonly PdfSegment[];
  readonly lines: PdfLine[];
};

type Cells = (string | null)[];

// Two cells in one column cost more than any distance on a page, so a line's
// cells share a column only when it has more of them than the table has.
const SHARED_COLUMN = 10_000;
// Edges within half a point are the same edge.
const EDGE_TOLERANCE = 0.5;
// A column lines up its cells on an edge at least half of them share.
const EDGE_SHARE = 0.5;
// A wrapped cell's next line sits within this many text heights below.
const WRAP_DISTANCE = 2;
// A wrapped cell can start up to this many text heights above its row's
// anchor: the movements export lifts a reference over two lines that much.
const EARLY_DISTANCE = 1;

const center = ({ left, right }: Span): number => (left + right) / 2;

// The header's segments, one per column name in order, if the line has them.
const headerOf = (
  line: PdfLine,
  names: readonly string[],
): PdfSegment[] | undefined => {
  const found: PdfSegment[] = [];
  let from = 0;
  for (const name of names) {
    const index = line.segments.findIndex(
      (segment, position) => position >= from && hasText(segment.text, name),
    );
    const segment = line.segments[index];
    if (segment === undefined) return undefined;
    found.push(segment);
    from = index + 1;
  }
  return found;
};

// Each page's table: the lines under its first header line. A page without
// the header has none.
const pageTables = (
  lines: readonly PdfLine[],
  names: readonly string[],
): PageTable[] => {
  const tables: PageTable[] = [];
  for (const line of lines) {
    const table = tables.at(-1);
    if (table?.page === line.page) {
      table.lines.push(line);
    } else {
      const header = headerOf(line, names);
      if (header !== undefined)
        tables.push({ page: line.page, header, lines: [] });
    }
  }
  return tables;
};

// How far a cell sits from a column: from the edge its cells line up on, or
// from its header's edges or center, whichever is nearest.
const distance = (segment: PdfSegment, column: Column): number =>
  Math.min(
    Math.abs(segment.left - (column.left ?? Infinity)),
    Math.abs(segment.right - (column.right ?? Infinity)),
    Math.abs(segment.left - column.header.left),
    Math.abs(segment.right - column.header.right),
    Math.abs(center(segment) - center(column.header)),
  );

// The cheapest column for the previous segment, at or left of `column`.
const bestBefore = (previous: readonly number[], column: number) => {
  let best = { total: Infinity, from: 0 };
  previous.slice(0, column + 1).forEach((total, from) => {
    const cost = total + (from === column ? SHARED_COLUMN : 0);
    if (cost < best.total) best = { total: cost, from };
  });
  return best;
};

// Each segment of a line to a column, keeping their order left to right, at
// the least total distance (dynamic programming over segments and columns).
const assign = (
  segments: readonly PdfSegment[],
  columns: readonly Column[],
): number[] => {
  const totals: number[][] = [];
  const froms: number[][] = [];
  for (const segment of segments) {
    const previous = totals.at(-1);
    const steps = columns.map((column, index) => {
      const here = distance(segment, column);
      if (previous === undefined) return { total: here, from: -1 };
      const best = bestBefore(previous, index);
      return { total: here + best.total, from: best.from };
    });
    totals.push(steps.map(({ total }) => total));
    froms.push(steps.map(({ from }) => from));
  }
  // Back from the cheapest column of the last segment.
  const last = totals.at(-1) ?? [];
  let column = last.indexOf(Math.min(...last));
  const assignment: number[] = [];
  for (let index = froms.length - 1; index >= 0; index -= 1) {
    assignment.unshift(column);
    column = froms[index]?.[column] ?? -1;
  }
  return assignment;
};

// The edge most of a column's cells share, if they share one.
const sharedEdge = (edges: readonly number[]): number | undefined => {
  const sorted = edges.toSorted((a, b) => a - b);
  let largest: readonly number[] = [];
  let start = 0;
  sorted.forEach((edge, end) => {
    while (edge - (sorted[start] ?? edge) > EDGE_TOLERANCE) start += 1;
    if (end - start + 1 > largest.length)
      largest = sorted.slice(start, end + 1);
  });
  if (largest.length < 2 || largest.length < EDGE_SHARE * edges.length) {
    return undefined;
  }
  return largest.reduce((sum, edge) => sum + edge, 0) / largest.length;
};

const fromHeader = (
  header: readonly PdfSegment[],
  edges: readonly Edges[] = [],
) =>
  header.map(({ left, right }, index): Column => ({
    header: { left, right },
    ...edges[index],
  }));

// Where each column lines up its cells, learned from the lines with several
// cells, whose order places them; a lone cell, such as an end marker or a
// description the bank left as `0`, is then placed by it.
const learnEdges = (tables: readonly PageTable[], width: number): Edges[] => {
  const lefts: number[][] = Array.from({ length: width }, () => []);
  const rights: number[][] = Array.from({ length: width }, () => []);
  for (const { header, lines } of tables) {
    const columns = fromHeader(header);
    for (const { segments } of lines.filter(
      ({ segments }) => segments.length > 1,
    )) {
      const columnOf = assign(segments, columns);
      segments.forEach(({ left, right }, index) => {
        const column = columnOf[index] ?? 0;
        lefts[column]?.push(left);
        rights[column]?.push(right);
      });
    }
  }
  return lefts.map((left, index) => ({
    left: sharedEdge(left),
    right: sharedEdge(rights[index] ?? []),
  }));
};

/**
 * A PDF's table, page after page: each page's header, found by its names in
 * order, ignoring accents and case, never by fixed positions, and each line
 * under it with the column each of its segments goes to. A line's segments
 * keep their order, at the columns they sit nearest: by their titles, then by
 * the edge most of a column's cells share (the left of text, the right of
 * amounts), learned from the lines with several cells.
 */
export const pdfTables = (
  lines: readonly PdfLine[],
  names: readonly string[],
): readonly PdfTable[] => {
  const tables = pageTables(lines, names);
  const edges = learnEdges(tables, names.length);
  return tables.map(({ page, header, lines: tableLines }) => {
    const columns = fromHeader(header, edges);
    return {
      page,
      header,
      lines: tableLines.map((line) => ({
        line,
        columns: assign(line.segments, columns),
      })),
    };
  });
};

const toCells = ({ line, columns }: PdfTableLine, width: number): Cells => {
  const cells: Cells = Array.from({ length: width }, () => null);
  line.segments.forEach(({ text }, index) => {
    const column = columns[index] ?? 0;
    const cell = cells[column] ?? null;
    cells[column] = cell === null ? text : `${cell} ${text}`;
  });
  return cells;
};

const append = (row: Cells, cells: Cells): void => {
  cells.forEach((cell, index) => {
    if (cell === null) return;
    const before = row[index] ?? null;
    row[index] = before === null ? cell : `${before} ${cell}`;
  });
};

type Placement = "anchored" | "own" | "above" | "below";

/** A page's lines under its header, their cells, and the anchor's column. */
type PageCells = {
  readonly lines: readonly PdfLine[];
  readonly cells: readonly Cells[];
  readonly anchor: number;
};

/** The rows so far, the last one with the anchor, and lines waiting for it. */
type Assembly = { readonly rows: Cells[]; anchoredRow?: Cells; early?: Cells };

const joined = (first: Cells, second: Cells): Cells => {
  const row = [...first];
  append(row, second);
  return row;
};

// Where a line goes: a row of its own, with the anchor or without it (a
// page's footer), or, as part of a wrapped cell, the row below, whose
// anchor it sits just above, or the row above, right over it or, after a page
// break, on the page before.
const placementOf = (page: PageCells, index: number): Placement => {
  const { lines, cells, anchor } = page;
  const line = lines[index];
  if (anchor === -1 || line === undefined || cells[index]?.[anchor] !== null) {
    return "anchored";
  }
  const next = lines[index + 1];
  const nextIsAnchored = (cells[index + 1]?.[anchor] ?? null) !== null;
  if (
    next !== undefined &&
    nextIsAnchored &&
    next.y - line.y <= EARLY_DISTANCE * line.height
  ) {
    return "below";
  }
  const previous = lines[index - 1];
  return previous === undefined ||
    line.y - previous.y <= WRAP_DISTANCE * line.height
    ? "above"
    : "own";
};

const placeLine = (
  assembly: Assembly,
  cells: Cells,
  placement: Placement,
): void => {
  if (placement === "below") {
    assembly.early =
      assembly.early === undefined ? cells : joined(assembly.early, cells);
  } else if (placement === "above" && assembly.anchoredRow !== undefined) {
    append(assembly.anchoredRow, cells);
  } else if (placement === "anchored") {
    const row =
      assembly.early === undefined ? cells : joined(assembly.early, cells);
    assembly.early = undefined;
    assembly.rows.push(row);
    assembly.anchoredRow = row;
  } else {
    assembly.rows.push(cells);
  }
};

/**
 * A table's rows from a PDF's lines, as a spreadsheet would hold them: page
 * after page, the page's header as printed, then a row of text cells (`null`
 * when empty) for each line under it, its segments in the columns
 * `pdfTables` gives them. With an anchor, a line without it belongs to a cell
 * wrapped over several lines, which joins its row, also across a page break;
 * a page's footer stays a row of its own.
 */
export const pdfTableRows = (
  lines: readonly PdfLine[],
  { columns: names, anchor }: PdfTableLayout,
): SheetRows => {
  const anchorIndex = anchor === undefined ? -1 : names.indexOf(anchor);
  const assembly: Assembly = { rows: [] };
  for (const table of pdfTables(lines, names)) {
    assembly.rows.push(table.header.map(({ text }) => text));
    const page: PageCells = {
      lines: table.lines.map(({ line }) => line),
      cells: table.lines.map((placed) => toCells(placed, names.length)),
      anchor: anchorIndex,
    };
    page.cells.forEach((cells, index) =>
      placeLine(assembly, cells, placementOf(page, index)),
    );
  }
  return assembly.rows;
};
