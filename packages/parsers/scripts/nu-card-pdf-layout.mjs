// Lays out a Nu credit card statement as its PDF prints it (Appendix A.5 of
// docs/ROADMAP.md), as the text items pdf.js reads: a first page with the
// holder's block, the cards, the dates under their labels, the limit, and
// "Resumen de tu extracto", each amount beside its label; then the movements,
// each row's date over two lines or one, its description over two, a rate a
// little apart from what it charges, and its sub-rows; "Pago mínimo" after
// them, on their page or the next; and each page's footer. Courier, so the
// PDF writer sets each item as wide as it says. Invented data only.

// Courier: each character takes 0.6 of the font size.
const COURIER = 0.6;
// The movements' columns' left edges, the size of their cells and a row's
// height, taller with what goes under it.
const COLUMNS = [30, 80, 150, 210, 258, 320, 422, 504];
const RATE_VALUE = 355;
const CELL_SIZE = 6;
const ROW_HEIGHT = 46;
const TALL_ROW_HEIGHT = 66;
// The summary's labels' left edge and where its amounts end.
const LEDGER = { label: 292, amount: 563 };

const round = (value) => Math.round(value * 100) / 100;
const widthOf = (str, size) => str.length * COURIER * size;

const text = (str, [x, y], size) => [
  {
    str,
    x: round(x),
    y: round(y),
    width: round(widthOf(str, size)),
    height: size,
  },
];

const ending = (str, [right, y], size) =>
  text(str, [right - widthOf(str, size), y], size);

const footer = (page, pages) => [
  ...text("Nu Financiera", [42, 750], 7),
  ...text("La tasa de interés está en Mes Vencido.", [180, 750], 7),
  ...text("Bogotá D.C. Colombia", [42, 758], 7),
  ...text("NIT 900.000.000-1", [42, 771], 7),
  ...text(`${page} / ${pages}`, [515, 785], 8),
];

const holderBlock = ({ greeting, name, id, address }, { month, cards }) => [
  ...text(greeting, [31, 103], 18),
  ...text(`Llegó tu extracto de ${month}`, [31, 128], 14),
  ...text(name, [31, 171], 12),
  ...text("Tus tarjetas", [280, 171], 12),
  ...text(id, [31, 192], 10),
  ...text("Tarjeta física", [280, 192], 10),
  ...text("Tarjeta virtual", [400, 192], 10),
  ...text(address, [31, 217], 10),
  ...text(`• • • • ${cards.physical}`, [280, 217], 10),
  ...text(`• • • • ${cards.virtual}`, [400, 217], 10),
];

const datesBlock = ({ due, cut, period }) => [
  ...text("Fecha límite de pago", [149, 269], 9),
  ...text("Fecha de corte", [282, 269], 9),
  ...text("Periodo facturado", [425, 269], 9),
  ...text(due, [149, 287], 9),
  ...text(cut, [282, 287], 9),
  ...text(period.join(" - "), [425, 287], 9),
];

// The left column: the limit, what's used and available, and what was paid.
const limitsBlock = ({ limit, used, available, paid, toMinimum, toTotal }) => [
  ...text("Tu cupo definido", [45, 404], 10),
  ...text(limit, [45, 416], 10),
  ...text("Usado", [45, 444], 8),
  ...ending("Disponible", [244, 444], 8),
  ...text(used, [45, 453.7], 8),
  ...ending(available, [244, 453.7], 8),
  ...text(`Abonaste ${paid}`, [47, 509], 10),
  ...text(`${toMinimum} a tu pago mínimo`, [60, 526], 9),
  ...text(`${toTotal} a tu pago total`, [60, 545], 9),
];

// The summary's lines, each label at the left and its amount at the right,
// on the heights the bank prints them.
const ledgerBlock = (lines) => {
  const heights = [
    383, 404, 431, 453.7, 479, 503, 526, 551, 584, 609, 635, 662,
  ];
  const short = [383, 404, 431, 453.7, 479, 503, 526, 560, 585, 611, 638];
  const ys = lines.length === heights.length ? heights : short;
  return [
    ...text("Resumen de tu extracto", [30, 338], 12),
    ...lines.flatMap(([label, amount], index) => [
      ...text(label, [LEDGER.label, ys[index]], 9),
      ...ending(amount, [LEDGER.amount, ys[index]], 9),
    ]),
  ];
};

const headerLines = () => [
  ...[
    "Fecha",
    "Descripción",
    "Valor",
    "Cuotas",
    "Valor",
    "Interés del mes",
    "Total a pagar",
    "Restante",
  ].flatMap((name, column) => text(name, [COLUMNS[column], 58.7], 7)),
  ...[
    ["del mes", 4],
    ["Porcentaje y valor", 5],
    ["este mes", 6],
    ["por pagar", 7],
  ].flatMap(([name, column]) => text(name, [COLUMNS[column], 66], 6)),
];

// A row's cells on its first line; a rate and what it charges a little apart.
const firstLine = (cells, y) =>
  cells.flatMap((cell, column) => {
    if (cell === null) return [];
    if (column !== 5) return text(cell, [COLUMNS[column], y], CELL_SIZE);
    const [rate, charged] = cell;
    return [
      ...text(rate, [COLUMNS[column], y], CELL_SIZE),
      ...text(charged, [RATE_VALUE, y], CELL_SIZE),
    ];
  });

// What goes under a row's first line: the year, the description's end, and
// a payment's parts, a conversion charge or late interest.
const underLines = (row, y) => {
  const [, year] = row.date;
  const [, more] = row.text;
  const second = row.payment === undefined ? y + 8.4 : y + 6.5;
  return [
    ...(year === undefined ? [] : text(year, [COLUMNS[0], second], CELL_SIZE)),
    ...(more === undefined ? [] : text(more, [COLUMNS[1], second], CELL_SIZE)),
    ...(row.subRows ?? []).flatMap(([str, offset, size, charge]) => [
      ...text(str, [COLUMNS[2], y + offset], size),
      ...(charge === undefined
        ? []
        : text(charge, [COLUMNS[6], y + offset], size)),
    ]),
    ...(row.late === undefined
      ? []
      : [
          ...text("Intereses en", [COLUMNS[1], y + 22], 7),
          ...text(row.late[0], [COLUMNS[5], y + 22], 7),
          ...text(row.late[1], [RATE_VALUE, y + 22], 7),
          ...text("mora", [COLUMNS[1], y + 30.4], 7),
        ]),
  ];
};

const rowsItems = (rows) => {
  const items = [];
  let y = 94;
  for (const row of rows) {
    items.push(...firstLine(row.cells, y), ...underLines(row, y));
    y += row.tall ? TALL_ROW_HEIGHT : ROW_HEIGHT;
  }
  return { items, end: y };
};

const minimumAgain = (minimum, y) => [
  ...text("Pago mínimo", [COLUMNS[6], y], 7),
  ...text(minimum, [COLUMNS[6], y + 15], 7),
];

const contact = () => [
  ...text("¿Tienes preguntas sobre tu extracto?", [30, 550], 14),
  ...text("Por correo", [50, 629], 10),
  ...text("ayuda@ejemplo.com.co", [50, 648], 10),
  ...text("Sobre tus compras internacionales", [51, 700], 10),
];

/**
 * The text items of each page of a Nu statement's PDF. `statement` holds the
 * holder and the cards, the month's dates, the limits and the summary's lines
 * as printed, and its rows, each with its first line's cells in the header's
 * order (the interest as a rate and what it charges) and what goes under it.
 */
export const nuCardPdfPages = (statement) => {
  const { items: rows, end } = rowsItems(statement.rows);
  const minimum = minimumAgain(
    statement.minimum,
    statement.minimumOnItsOwnPage ? 29 : end,
  );
  const pages = statement.minimumOnItsOwnPage ? 3 : 2;
  const front = [
    ...holderBlock(statement.holder, statement),
    ...datesBlock(statement),
    ...limitsBlock(statement.limits),
    ...ledgerBlock(statement.ledger),
    ...footer(1, pages),
  ];
  const movements = [
    ...headerLines(),
    ...rows,
    ...(statement.minimumOnItsOwnPage ? [] : [...minimum, ...contact()]),
    ...footer(2, pages),
  ];
  const last = [...minimum, ...contact(), ...footer(3, pages)];
  return [
    { items: front },
    { items: movements },
    ...(statement.minimumOnItsOwnPage ? [{ items: last }] : []),
  ];
};
