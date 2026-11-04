// Lays out a movements export as Bancolombia's online banking prints it in
// PDF (Appendix A.2b of docs/ROADMAP.md), as the text items pdf.js reads: the
// first page opens with its titles, the date and time it was downloaded, the
// holder's name under it, and the account's type and number; every page holds
// the table, newest movement first, titles and text lined up on their left
// and amounts on their right; a description or a reference too wide for its
// column wraps to a second line, a reference starting half a line above its
// row's date; and each page ends with the IP address it was downloaded from.
// One item per line of a cell, as pdf.js reads the bank's; Courier, so the PDF
// writer sets each item as wide as it says. Invented data only.

// Courier: each character takes 0.6 of the font size.
const COURIER = 0.6;
const SIZE = 10;
const DATE_LEFT = 44;
const DESCRIPTION_LEFT = 140;
const REFERENCE_LEFT = 296;
const AMOUNT_RIGHT = 552;
// The characters a line of a cell holds before the next word wraps.
const DESCRIPTION_WIDTH = 23;
const REFERENCE_WIDTH = 20;
// From a row's date to the next one's, and how much more a wrapped row takes.
const ROW_HEIGHT = 41;
const WRAPPED_EXTRA = 8.7;
// A wrapped description's second line, under its first.
const WRAP_LINE = 16.3;
// A reference over two lines: above its row's date, and below it.
const EARLY_LINE = 8;
const LATE_LINE = 8.3;
const FIRST_TITLES_Y = 251.4;
const NEXT_TITLES_Y = 109.7;
const TITLES_TO_ROW = 40;
const LAST_ROW_Y = 720;
const FOOTER_Y = 770;
// An address of the range kept for documentation (RFC 5737).
const IP_ADDRESS = "203.0.113.7";
const MONTHS = "ene feb mar abr may jun jul ago sep oct nov dic".split(" ");
// The bank writes null for some movements without a reference; which ones
// isn't known, so here a transfer from another bank does.
const PRINTS_NULL = /^PAGO INTERBANC /;

const round = (value) => Math.round(value * 100) / 100;

const item = (str, [x, y], size = SIZE) => ({
  str,
  x: round(x),
  y: round(y),
  width: round(str.length * COURIER * size),
  height: size,
});

const endingAt = (str, [right, y], size = SIZE) =>
  item(str, [right - str.length * COURIER * size, y], size);

// "2026-10-07" as the PDF prints it: "07 oct 2026".
const dateText = (date) =>
  `${date.slice(8)} ${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;

// As the PDF prints amounts: "-$ 84.250,50", "$ 4,87".
const amountText = (cents) => {
  const pesos = String(Math.trunc(Math.abs(cents) / 100)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );
  const decimals = String(Math.abs(cents) % 100).padStart(2, "0");
  return `${cents < 0 ? "-" : ""}$ ${pesos},${decimals}`;
};

// A cell's lines, broken between words as the page wraps them. The PDF
// prints one space where the spreadsheet's description has two.
const linesOf = (text, width) => {
  const lines = [];
  for (const word of text.split(/ +/)) {
    const line = lines.at(-1);
    if (line !== undefined && line.length + 1 + word.length <= width) {
      lines[lines.length - 1] = `${line} ${word}`;
    } else {
      lines.push(word);
    }
  }
  return lines;
};

// "12345678901" in the groups the PDF prints it in: "123 - 456789 - 01".
const groupedNumber = (number) =>
  `${number.slice(0, 3)} - ${number.slice(3, 9)} - ${number.slice(9)}`;

const pageTop = ({ holder, account, downloadedAt }) => [
  item("Sucursal Virtual Personas", [32, 112.7], 14),
  endingAt(downloadedAt, [563.3, 112.7], 9),
  endingAt(holder, [563.3, 128.4], 9),
  item("Movimientos: Cuentas", [32, 141.8], 14),
  item("Cuenta de Ahorros", [32, 183.8], 12),
  item(`Ahorros ${groupedNumber(account)}`, [32, 200.2], 12),
];

const titles = (y) => [
  item("Fecha", [DATE_LEFT, y]),
  item("Descripción", [DESCRIPTION_LEFT, y]),
  item("Referencia", [REFERENCE_LEFT, y]),
  endingAt("Valor", [AMOUNT_RIGHT, y]),
];

// A movement's lines, from it as fixture-data.mjs writes it: [date,
// description, amount in cents, extra], its reference in `extra`.
const cellsOf = ([date, description, amount, { reference } = {}]) => {
  const printed = reference ?? (PRINTS_NULL.test(description) ? "null" : null);
  return {
    date: dateText(date),
    description: linesOf(description, DESCRIPTION_WIDTH),
    reference: printed === null ? [] : linesOf(printed, REFERENCE_WIDTH),
    amount: amountText(amount),
  };
};

const isWrapped = ({ description, reference }) =>
  description.length > 1 || reference.length > 1;

const rowItems = (cells, y) => {
  const [first, second, ...more] = cells.reference;
  if (more.length > 0) throw new Error("A reference wraps to two lines only.");
  const referenceYs =
    second === undefined ? [y] : [y - EARLY_LINE, y + LATE_LINE];
  return [
    item(cells.date, [DATE_LEFT, y]),
    ...cells.description.map((line, index) =>
      item(line, [DESCRIPTION_LEFT, y + WRAP_LINE * index]),
    ),
    ...[first, second].flatMap((line, index) =>
      line === undefined
        ? []
        : [item(line, [REFERENCE_LEFT, referenceYs[index]])],
    ),
    endingAt(cells.amount, [AMOUNT_RIGHT, y]),
  ];
};

// Each page's rows and where its first one starts: a row never splits.
const pagesOf = (rows) => {
  const pages = [{ titlesY: FIRST_TITLES_Y, rows: [] }];
  let y = FIRST_TITLES_Y + TITLES_TO_ROW;
  for (const cells of rows) {
    if (y > LAST_ROW_Y) {
      pages.push({ titlesY: NEXT_TITLES_Y, rows: [] });
      y = NEXT_TITLES_Y + TITLES_TO_ROW;
    }
    pages.at(-1).rows.push({ cells, y });
    y += ROW_HEIGHT + (isWrapped(cells) ? WRAPPED_EXTRA : 0);
  }
  return pages;
};

/**
 * The text items of each page of a movements export's PDF. `statement` holds
 * the holder's name, the account's number, the date and time it was
 * downloaded as printed, and the movements newest first, as fixture-data.mjs
 * writes them.
 */
export const movementsPdfPages = (statement) =>
  pagesOf(statement.movements.map(cellsOf)).map(({ titlesY, rows }, index) => ({
    items: [
      ...(index === 0 ? pageTop(statement) : []),
      ...titles(titlesY),
      ...rows.flatMap(({ cells, y }) => rowItems(cells, y)),
      item(`Dirección IP ${IP_ADDRESS}`, [423.8, FOOTER_Y], 12),
    ],
  }));
