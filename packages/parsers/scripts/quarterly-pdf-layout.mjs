// Lays out a quarterly statement as Bancolombia prints it in PDF (Appendix A.3
// of docs/ROADMAP.md), as the text items pdf.js reads: every page repeats the
// header box and, left of it, the holder's block; the first page has the
// summary; the movements table's titles sit centered over their columns,
// dates and amounts line up on their right and text on its left; from the
// second page the text comes column by column; each page ends with the bank's
// contact and its number. Courier throughout, so the PDF writer sets each item
// as wide as it says. Invented data only.

// Courier: each character takes 0.6 of the font size.
const COURIER = 0.6;
// The table's titles' centers and where its cells line up, in points.
const CENTERS = [47, 163, 295, 370, 452, 552];
const TITLES = ["FECHA", "DESCRIPCIÓN", "SUCURSAL", "DCTO.", "VALOR", "SALDO"];
const DATE_RIGHT = 58;
const DESCRIPTION_LEFT = 79;
const BRANCH_LEFT = 252;
const AMOUNT_RIGHT = 503;
const BALANCE_RIGHT = 600;
const ROW_SIZE = 6;
const ROW_HEIGHT = 7.7;
const FIRST_TABLE_Y = 370;
const NEXT_TABLE_Y = 190;
const SUMMARY_LABELS = [
  ["SALDO ANTERIOR", "SALDO PROMEDIO"],
  ["TOTAL ABONOS", "CUENTAS X COBRAR"],
  ["TOTAL CARGOS", "VALOR INTERESES PAGADOS"],
  ["SALDO ACTUAL", "RETEFUENTE"],
];

const round = (value) => Math.round(value * 100) / 100;

const item = (str, [x, y], size) => ({
  str,
  x: round(x),
  y: round(y),
  width: round(str.length * COURIER * size),
  height: size,
});

// A text as pdf.js reads Courier: one item per word, where it falls.
const words = (text, [x, y], size) =>
  [...text.matchAll(/\S+/g)].map((match) =>
    item(match[0], [x + match.index * COURIER * size, y], size),
  );

const endingAt = (text, [right, y], size) =>
  item(text, [right - text.length * COURIER * size, y], size);

const centeredOn = (text, [middle, y], size) =>
  item(text, [middle - (text.length * COURIER * size) / 2, y], size);

const pageHeader = ({ holder, account, period }) => [
  ...words("ESTADO DE CUENTA", [380, 72], 10),
  item("DESDE:", [325, 92], 8),
  item(period.from, [365, 92], 8),
  item("HASTA:", [450, 92], 8),
  item(period.to, [490, 92], 8),
  ...words(account.type, [325, 108], 8),
  item("NÚMERO", [325, 124], 8),
  item(account.number, [380, 124], 8),
  ...words(account.branch, [325, 140], 8),
  ...holder.flatMap((line, index) => words(line, [18, 113 + 17 * index], 8)),
];

const promotion = () => [
  ...words("Consulta tus extractos cuando quieras", [360, 185], 8),
  ...words("en la sucursal virtual.", [360, 197], 8),
];

const summaryBlock = (summary) => [
  ...words("RESUMEN", [290, 290], 8),
  ...SUMMARY_LABELS.flatMap(([left, right], index) => {
    const y = 305 + 12 * index;
    return [
      ...words(left, [45, y], 7),
      item("$", [135, y], 7),
      endingAt(summary[left], [300, y], 7),
      ...words(right, [330, y], 7),
      item("$", [470, y], 7),
      endingAt(summary[right], [590, y], 7),
    ];
  }),
];

const titles = (y) =>
  TITLES.map((title, index) => centeredOn(title, [CENTERS[index], y], 8));

// The PDF prints one space where the spreadsheet's description has two.
const movementItems = ([date, description, branch, , amount, balance], y) => [
  endingAt(date, [DATE_RIGHT, y], ROW_SIZE),
  ...words(description.replace(/ {2,}/g, " "), [DESCRIPTION_LEFT, y], ROW_SIZE),
  ...(branch === null ? [] : words(branch, [BRANCH_LEFT, y], ROW_SIZE)),
  endingAt(amount, [AMOUNT_RIGHT, y], ROW_SIZE),
  endingAt(balance, [BALANCE_RIGHT, y], ROW_SIZE),
];

const footer = (page) => [
  ...words("DCF:defensor@ejemplo.com.co", [150, 760], 6),
  ...words(`PÁGINA: ${page}`, [540, 775], 7),
];

// The rows each page holds: fewer on the first, under the summary.
const pagesOf = (rows, { firstPage, pageSize }) => {
  const pages = [rows.slice(0, firstPage)];
  for (let start = firstPage; start < rows.length; start += pageSize) {
    pages.push(rows.slice(start, start + pageSize));
  }
  return pages;
};

/**
 * The text items of each page of a quarterly statement's PDF. `statement`
 * holds the holder's three lines, the account's type, number and branch, the
 * period as printed, the summary's amounts by label, and the movement rows as
 * the spreadsheet holds them.
 */
export const quarterlyPdfPages = (
  statement,
  { firstPage = 30, pageSize = 69 } = {},
) => {
  const pages = pagesOf(statement.rows, { firstPage, pageSize });
  return pages.map((rows, index) => {
    const isFirst = index === 0;
    const tableY = isFirst ? FIRST_TABLE_Y : NEXT_TABLE_Y;
    const rowY = (row) => tableY + 14 + ROW_HEIGHT * row;
    const isLast = index === pages.length - 1;
    const items = [
      ...pageHeader(statement),
      ...(isFirst ? [...promotion(), ...summaryBlock(statement.summary)] : []),
      ...titles(tableY),
      ...rows.flatMap((row, position) => movementItems(row, rowY(position))),
      ...(isLast
        ? words(
            "FIN ESTADO DE CUENTA",
            [DESCRIPTION_LEFT, rowY(rows.length)],
            ROW_SIZE,
          )
        : []),
      ...footer(index + 1),
    ];
    // From the second page the bank writes the text column by column.
    return { items: isFirst ? items : items.toSorted((a, b) => a.x - b.x) };
  });
};

// One text item per line, so a PDF fixture reads like the page.
export const renderPdf = (pages) =>
  [
    "{",
    '  "type": "pdf",',
    '  "pages": [',
    pages
      .map(({ items }) =>
        [
          "    {",
          '      "items": [',
          items.map((item) => `        ${JSON.stringify(item)}`).join(",\n"),
          "      ]",
          "    }",
        ].join("\n"),
      )
      .join(",\n"),
    "  ]",
    "}",
    "",
  ].join("\n");
