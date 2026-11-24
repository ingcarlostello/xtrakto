// Lays out a Bancolombia credit card statement as its PDF prints it (Appendix
// A.4b of docs/ROADMAP.md), as the text items pdf.js reads: for each currency,
// pesos first, a page with the holder's block, the card, what's due, both
// summaries and the rates, then a page with the tables of movements. Bold
// text is drawn three times, each a fraction of a point further right, as the
// bank draws it; a value sits under its label or beside it; the movements'
// header takes two lines, and every cell is centered under its title. Courier,
// so the PDF writer sets each item as wide as it says. Invented data only.

// Courier: each character takes 0.6 of the font size.
const COURIER = 0.6;
const BOLD_OFFSETS = [0, 0.1, 0.2];
// The movements' columns: their centers, and their header's two lines.
const CENTERS = [50.2, 108.4, 191.8, 283.6, 337.6, 389.5, 447.7, 497.5, 557.8];
const HEADER = [
  ["Número de", "autorización"],
  ["Fecha"],
  ["Movimientos"],
  ["Valor", "movimiento"],
  ["Número", "cuotas"],
  ["Valor", "Couta/Abono"],
  ["% Interés", "mensual"],
  ["% Interés", "anual"],
  ["Saldo", "pendiente"],
];
const CELL_SIZE = 7;
const ROW_HEIGHT = 25;
// Each summary's columns: its categories' center, its labels' left edge,
// where the sign sits and where its amounts end.
const TOTAL = { category: 55, label: 95, sign: 215, amount: 295 };
const MINIMUM = { category: 345, label: 385, sign: 505, amount: 590 };
const SUMMARY_SIZE = 8;
const TOTAL_LINES = [
  ["+ Saldo anterior", 432],
  ["+ Compras del mes", 447],
  ["+ Intereses de mora", 459],
  ["+ Intereses corrientes", 477],
  ["+ Avances", 492],
  ["+ Otros cargos", 505],
  ["(-) Pagos / abonos", 532],
  ["(-) Saldo a favor", 544],
];
// "Otros Cargos" sits in its categories' column.
const MINIMUM_LINES = [
  ["+ Cuota transacciones", 432],
  ["+ Cuota transacciones", 471],
  ["+ Cuota avances", 505],
  ["+ Intereses de mora", 532],
  ["+ Intereses corrientes", 544],
  ["Otros Cargos", 567, MINIMUM.category],
  ["(+) En mora", 586],
  ["(-) A favor", 602],
];
const RATES = {
  PESOS: ["Compra a una cuota", "Compra 2 - 36 cuotas", "Impuestos", "Avances"],
  DOLARES: ["Compra Internacional", "Avance Internacional"],
};

const round = (value) => Math.round(value * 100) / 100;
const widthOf = (str, size) => str.length * COURIER * size;

// A text from its left edge, as one item.
const text = (str, [x, y], size) => [
  {
    str,
    x: round(x),
    y: round(y),
    width: round(widthOf(str, size)),
    height: size,
  },
];

const centered = (str, [middle, y], size) =>
  text(str, [middle - widthOf(str, size) / 2, y], size);

const ending = (str, [right, y], size) =>
  text(str, [right - widthOf(str, size), y], size);

// Bold, as the bank draws it: each item three times.
const bold = (items) =>
  items.flatMap((item) =>
    BOLD_OFFSETS.map((offset) => ({ ...item, x: round(item.x + offset) })),
  );

const pageTop = (card) => [
  ...bold(text(`Tarjeta: *********${card}`, [470, 32], 9)),
  ...text("NIT: 890.000.000-1", [63, 51], 9),
];

const footer = () =>
  text(
    "DCF:defensor@ejemplo.com.co;www.ejemplo.com.co/defensor; Tel 604 000 0000",
    [141, 770],
    5,
  );

const clientBlock = ([name, , address, city, department]) => [
  ...text(name, [40, 86], 22),
  ...text(address, [40, 131], 14),
  ...text(city, [40, 149], 14),
  ...text(department, [40, 166], 14),
];

// What's due under its labels; the limit and what's available beside theirs.
const paymentBlock = ({ card, currency, words, period, due, payment }) => [
  ...bold(text(`Información de la Tarjeta *${card}`, [90, 188], 10)),
  ...bold(text(`Moneda: ${currency}`, [90, 203], 10)),
  ...bold(centered("Cupo de tu tarjeta", [135, 248], 12)),
  ...bold(centered(`Información de pago en ${words}`, [405, 248], 12)),
  ...centered("Deuda a la fecha de corte:", [130, 274], 11),
  ...centered("Periodo facturado", [330, 274], 11),
  ...centered("Pago Total:", [500, 274], 11),
  ...centered(period.join(" - "), [330, 293], 12),
  ...bold(centered(payment.total, [500, 293], 16)),
  ...bold(centered(payment.debt, [130, 304], 18)),
  ...centered("Pagar antes de:", [332, 319], 11),
  ...centered("Pago mínimo:", [500, 319], 11),
  ...text(`Cupo total:  ${payment.limit}`, [60, 329], 11),
  ...text(`Disponible:  ${payment.available}`, [60, 341], 11),
  ...bold(centered(due, [332, 341], 16)),
  ...bold(centered(payment.minimum, [500, 341], 16)),
];

// A summary's line: its label, the sign apart, and the amount.
const summaryLine = (columns, [label, y, middle], amount) => [
  ...(middle === undefined
    ? text(label, [columns.label, y], SUMMARY_SIZE)
    : centered(label, [middle, y], SUMMARY_SIZE)),
  ...text("$", [columns.sign, y], SUMMARY_SIZE),
  ...ending(amount, [columns.amount, y], SUMMARY_SIZE),
];

const categories = (columns, lines) =>
  lines.flatMap(([label, y]) =>
    centered(label, [columns.category, y], SUMMARY_SIZE),
  );

// Both summaries, as the real statement places them: the charges' total and
// the credits' under their categories, this period's installments with its
// dates under the label, the earlier ones' with "anteriores".
const summaries = ({ period, summary }) => [
  ...bold(centered("Resumen saldo total", [165, 388], 12)),
  ...bold(centered("Detalle del pago mínimo", [446, 388], 12)),
  ...[66, 154, 252, 346, 432, 532].flatMap((middle, index) =>
    bold(
      centered(
        ["Categoría", "Transacción", "Valor"][index % 3],
        [middle, 413],
        10,
      ),
    ),
  ),
  ...TOTAL_LINES.flatMap((line, index) =>
    summaryLine(TOTAL, line, summary.total[index]),
  ),
  ...categories(TOTAL, [
    ["Cargos", 459],
    [summary.charges, 471],
    ["Abonos", 532],
    [summary.credits, 537],
  ]),
  ...text("Otros cargos", [TOTAL.label, 567], 12),
  ...text("Este valor incluye los siguientes conceptos:", [95, 586], 7),
  ...MINIMUM_LINES.flatMap((line, index) =>
    summaryLine(MINIMUM, line, summary.minimum[index]),
  ),
  ...[
    [`entre ${period[0]}`, 447],
    [`- ${period[1]}`, 459],
    ["anteriores", 485],
  ].flatMap(([words, y]) => text(words, [391, y], SUMMARY_SIZE)),
  ...categories(MINIMUM, [
    ["Cuotas", 471],
    ["Intereses", 537],
    ["Saldos", 594],
  ]),
];

const ratesBlock = (currency) => [
  ...bold(centered("Tasas de Interés vigente", [165, 645], 12)),
  ...bold(centered("Categoría", [87, 664], 10)),
  ...bold(centered("Tasa Mes Vencido", [175, 664], 10)),
  ...bold(centered("Tasa Efectivo", [275, 664], 10)),
  ...bold(centered("Anual", [275, 674], 10)),
  ...[...RATES[currency], "Mora"].flatMap((label, index) => {
    const y = 689 + 15 * index;
    return [
      ...text(label, [40, y], 9),
      ...ending("1.9000%", [215, y], 9),
      ...ending("25.3400%", [295, y], 9),
    ];
  }),
];

const headerLines = (y) =>
  HEADER.flatMap((names, column) =>
    names.flatMap((name, line) =>
      bold(centered(name, [CENTERS[column], y + 7 * line], CELL_SIZE)),
    ),
  );

const rowItems = (cells, y) =>
  cells.flatMap((cell, column) =>
    cell === null ? [] : centered(cell, [CENTERS[column], y], CELL_SIZE),
  );

// Each table that has movements: its title, its header and its rows.
const tablesItems = (period, { during, earlier }) => {
  const items = [];
  let y = 205;
  for (const [title, rows] of [
    [`Nuevos movimientos entre ${period[0]} hasta ${period[1]}`, during],
    [`Movimientos antes de ${period[0]}`, earlier],
  ]) {
    if (rows.length === 0) continue;
    items.push(
      ...bold(text(title, [30, y], 13)),
      ...headerLines(y + 21),
      ...rows.flatMap((cells, index) =>
        rowItems(cells, y + 51 + ROW_HEIGHT * index),
      ),
    );
    y += 51 + ROW_HEIGHT * (rows.length - 1) + 40;
  }
  return items;
};

const movementsPage = ({ card, period, currency, tables }) => [
  ...pageTop(card),
  ...text("ESTADO DE CUENTA EN:", [180, 51], 7),
  ...text(currency, [280, 51], 7),
  ...bold(text("Detalles del movimiento", [30, 80], 13)),
  ...text(
    "Recuerda estar al día en el pago de tu tarjeta para evitar cobro de intereses por mora,",
    [115, 119],
    8,
  ),
  ...text("débitos a tus cuentas y el bloqueo de tu tarjeta.", [115, 130], 8),
  ...tablesItems(period, tables),
  ...footer(),
];

/**
 * The text items of each page of a card statement's PDF. `statement` holds
 * the card's last 4 digits, the client's block as the sheet holds it, the
 * period's two dates as printed, and for each currency, pesos first: its
 * words ("pesos"), what's due and when, both summaries' amounts in their
 * lines' order, and its tables' rows, each row's cells in the header's order.
 */
export const cardPdfPages = ({ card, client, period, currencies }) =>
  currencies.flatMap((currency) => [
    {
      items: [
        ...pageTop(card),
        ...clientBlock(client),
        ...paymentBlock({ card, period, ...currency }),
        ...summaries({ period, ...currency }),
        ...ratesBlock(currency.currency),
        ...footer(),
      ],
    },
    { items: movementsPage({ card, period, ...currency }) },
  ]);
