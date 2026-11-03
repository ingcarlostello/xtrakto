import { describe, expect, it } from "vitest";
import type { PdfContent, PdfTextItem } from "@xtrakto/core";
import { pdfLines } from "./pdf-lines.helpers";
import { pdfTableRows } from "./pdf-table.helpers";

type At = readonly [number, number];

// Synthetic statements as pdf.js reads them. Invented values only.

// The quarterly statement: Courier at 8 points (4.8 points a character), one
// item per word, titles centered over their columns, dates and amounts lined
// up on their right, text on its left. As in the bank's, a description starts
// nearer the date's title than its own.
const COURIER = 4.8;

const courier = (str: string, [x, y]: At): PdfTextItem => ({
  str,
  x,
  y,
  width: Math.round(str.length * COURIER * 100) / 100,
  height: 8,
});

const words = (text: string, [x, y]: At): PdfTextItem[] =>
  [...text.matchAll(/\S+/g)].map((match) =>
    courier(match[0], [x + match.index * COURIER, y]),
  );

const endingAt = (text: string, [right, y]: At): PdfTextItem =>
  courier(text, [right - text.length * COURIER, y]);

const centeredOn = (text: string, [middle, y]: At): PdfTextItem =>
  courier(text, [middle - (text.length * COURIER) / 2, y]);

const QUARTERLY_COLUMNS = [
  "FECHA",
  "DESCRIPCIÓN",
  "SUCURSAL",
  "DCTO.",
  "VALOR",
  "SALDO",
];
const QUARTERLY_CENTERS = [73, 254, 457, 573, 700, 856];

type QuarterlyRow = readonly [
  date: string,
  description: string,
  branch: string | null,
  amount: string,
  balance: string,
];

// A movement's items, its amount's baseline a little off, as bold or larger
// figures leave it.
const quarterlyItems = (
  [date, description, branch, amount, balance]: QuarterlyRow,
  y: number,
): PdfTextItem[] => [
  endingAt(date, [80, y]),
  ...words(description, [100, y]),
  ...(branch === null ? [] : words(branch, [390, y])),
  endingAt(amount, [780, y + 0.3]),
  endingAt(balance, [930, y - 0.2]),
];

// A page: its own header block above the table, the table's titles, its
// movements, and its text in the order the bank writes it from page 2: one
// column after another, not one line after another.
const quarterlyPage = (
  rows: readonly QuarterlyRow[],
  trailing: readonly PdfTextItem[] = [],
): PdfTextItem[] =>
  [
    ...words("ESTADO DE CUENTA", [600, 40]),
    ...words("ANA PRUEBA EJEMPLO", [30, 120]),
    ...QUARTERLY_COLUMNS.map((name, index) =>
      centeredOn(name, [QUARTERLY_CENTERS[index] ?? 0, 290]),
    ),
    ...rows.flatMap((row, index) => quarterlyItems(row, 315 + 12 * index)),
    ...trailing,
  ].toSorted((a, b) => a.x - b.x);

// The movements export: a proportional font at 10 points, whose items are
// whole lines of a cell; titles and text lined up on their left, amounts on
// their right. A cell too wide for its column wraps to a second line.
const proportional = (str: string, [x, y]: At): PdfTextItem => ({
  str,
  x,
  y,
  width: str.length * 5,
  height: 10,
});

const MOVEMENTS_COLUMNS = ["Fecha", "Descripción", "Referencia", "Valor"];

const movementsHeader = (y: number): PdfTextItem[] => [
  proportional("Fecha", [68, y]),
  proportional("Descripción", [217, y]),
  proportional("Referencia", [459, y]),
  proportional("Valor", [857 - 25, y]),
];

type MovementLine = readonly [
  date: string | null,
  description: string | null,
  reference: string | null,
  amount: string | null,
];

const movementItems = (
  [date, description, reference, amount]: MovementLine,
  y: number,
): PdfTextItem[] => [
  ...(date === null ? [] : [proportional(date, [68, y])]),
  ...(description === null ? [] : [proportional(description, [217, y])]),
  ...(reference === null ? [] : [proportional(reference, [459, y])]),
  ...(amount === null
    ? []
    : [proportional(amount, [857 - amount.length * 5, y])]),
];

const pdf = (...pages: (readonly PdfTextItem[])[]): PdfContent => ({
  type: "pdf",
  pages: pages.map((items) => ({ items: [...items] })),
});

const quarterlyRows = (content: PdfContent) =>
  pdfTableRows(pdfLines(content), { columns: QUARTERLY_COLUMNS });

const movementsRows = (content: PdfContent) =>
  pdfTableRows(pdfLines(content), {
    columns: MOVEMENTS_COLUMNS,
    anchor: "Fecha",
  });

describe("pdfTableRows", () => {
  it("rebuilds a quarterly statement's rows from text written column by column, page after page with its header", () => {
    const content = pdf(
      quarterlyPage([
        ["1/07", "COMPRA EN  MERCADO XYZ", null, "-45,900.00", "1,054,100.00"],
        ["2/07", "0", null, "-1,000.00", "1,053,100.00"],
        [
          "12/07",
          "CONSIGNACION CORRESPONSAL CB",
          "CANAL CORRESPONSA",
          "287,450.00",
          "1,340,550.00",
        ],
      ]),
      quarterlyPage(
        [["30/09", "ABONO INTERESES AHORROS", null, "17.38", "1,340,567.38"]],
        words("FIN ESTADO DE CUENTA", [100, 327]),
      ),
    );

    expect(quarterlyRows(content)).toEqual([
      QUARTERLY_COLUMNS,
      [
        "1/07",
        "COMPRA EN  MERCADO XYZ",
        null,
        null,
        "-45,900.00",
        "1,054,100.00",
      ],
      ["2/07", "0", null, null, "-1,000.00", "1,053,100.00"],
      [
        "12/07",
        "CONSIGNACION CORRESPONSAL CB",
        "CANAL CORRESPONSA",
        null,
        "287,450.00",
        "1,340,550.00",
      ],
      QUARTERLY_COLUMNS,
      ["30/09", "ABONO INTERESES AHORROS", null, null, "17.38", "1,340,567.38"],
      [null, "FIN ESTADO DE CUENTA", null, null, null, null],
    ]);
  });

  it("finds the header ignoring accents and case", () => {
    const content = pdf([
      ...movementsHeader(164).map((item) => ({
        ...item,
        str: item.str.toUpperCase(),
      })),
      ...movementItems(["3 sep 2026", "DESCRIPCION", null, "-$ 1.000,00"], 197),
    ]);
    const rows = pdfTableRows(pdfLines(content), {
      columns: ["Fecha", "Descripcion", "Referencia", "Valor"],
    });

    expect(rows).toEqual([
      ["FECHA", "DESCRIPCIÓN", "REFERENCIA", "VALOR"],
      ["3 sep 2026", "DESCRIPCION", null, "-$ 1.000,00"],
    ]);
  });

  it("joins a cell wrapped over two lines to its row, also across a page break, but never a page's footer", () => {
    const content = pdf(
      [
        proportional("Movimientos: Cuentas", [50, 211]),
        ...movementsHeader(164 + 200),
        ...movementItems(
          ["12 sep 2026", "PAGO LLAVE EJEMPLO", null, "-$ 63.500,00"],
          397,
        ),
        ...movementItems(
          ["12 sep 2026", "PAGO PSE Servicios", "123456789", "-$ 148.270,00"],
          430,
        ),
        ...movementItems([null, "Ejemplo", null, null], 446.3),
        // A reference over two lines starts above its row's date, as the
        // bank's movements export sets it.
        ...movementItems([null, null, "ATM CENTRO", null], 468),
        ...movementItems(
          ["11 sep 2026", "RETIRO CAJERO ATM", null, "-$ 260.000,00"],
          476,
        ),
        ...movementItems([null, null, "COMERCIAL", null], 484.3),
        ...movementItems([null, "CENTRO", null, null], 492.3),
        ...movementItems(
          ["10 sep 2026", "PAGO PSE Empresa de", "987654321", "-$ 74.315,00"],
          522,
        ),
        proportional("Dirección IP 203.0.113.7", [658, 1248]),
      ],
      [
        ...movementsHeader(164),
        ...movementItems([null, "Servicios S", null, null], 197),
        ...movementItems(
          ["09 sep 2026", "ABONO INTERESES AHORROS", null, "$ 19,42"],
          230,
        ),
        proportional("Dirección IP 203.0.113.7", [658, 1248]),
      ],
    );

    expect(movementsRows(content)).toEqual([
      MOVEMENTS_COLUMNS,
      ["12 sep 2026", "PAGO LLAVE EJEMPLO", null, "-$ 63.500,00"],
      [
        "12 sep 2026",
        "PAGO PSE Servicios Ejemplo",
        "123456789",
        "-$ 148.270,00",
      ],
      [
        "11 sep 2026",
        "RETIRO CAJERO ATM CENTRO",
        "ATM CENTRO COMERCIAL",
        "-$ 260.000,00",
      ],
      [
        "10 sep 2026",
        "PAGO PSE Empresa de Servicios S",
        "987654321",
        "-$ 74.315,00",
      ],
      [null, null, null, "Dirección IP 203.0.113.7"],
      MOVEMENTS_COLUMNS,
      ["09 sep 2026", "ABONO INTERESES AHORROS", null, "$ 19,42"],
      [null, null, null, "Dirección IP 203.0.113.7"],
    ]);
  });

  it("keeps every line its own row when the format wraps no cell", () => {
    const content = pdf([
      ...movementsHeader(164),
      ...movementItems(
        ["12 sep 2026", "PAGO PSE Servicios", null, "-$ 148.270,00"],
        197,
      ),
      ...movementItems([null, "Ejemplo", null, null], 210),
    ]);
    const rows = pdfTableRows(pdfLines(content), {
      columns: MOVEMENTS_COLUMNS,
    });

    expect(rows).toEqual([
      MOVEMENTS_COLUMNS,
      ["12 sep 2026", "PAGO PSE Servicios", null, "-$ 148.270,00"],
      [null, "Ejemplo", null, null],
    ]);
  });

  it("reads nothing from a page without the table's header", () => {
    const content = pdf(
      words("Publicidad de ejemplo", [40, 300]),
      quarterlyPage([
        ["1/07", "COMPRA EN TIENDA", null, "-6,420.00", "993,580.00"],
      ]),
    );

    expect(quarterlyRows(content)).toEqual([
      QUARTERLY_COLUMNS,
      ["1/07", "COMPRA EN TIENDA", null, null, "-6,420.00", "993,580.00"],
    ]);
  });

  it("takes a line as the header only with its titles in the table's order", () => {
    const content = pdf([
      proportional("Descripción", [68, 164]),
      proportional("Fecha", [217, 164]),
      proportional("Referencia", [459, 164]),
      proportional("Valor", [832, 164]),
      ...movementItems(
        ["3 sep 2026", "COMPRA EN TIENDA", null, "-$ 1.000,00"],
        197,
      ),
    ]);

    expect(movementsRows(content)).toEqual([]);
  });
});
