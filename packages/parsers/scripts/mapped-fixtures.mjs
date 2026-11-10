// Invented banks' spreadsheets for the parser that reads through a format
// mapping (Stage 11), for generate-fixtures.mjs: the same September of
// invented movements in five layouts no parser knows. Banks, names, numbers
// and amounts are invented; none is a real bank's layout.

const DAY_MS = 24 * 60 * 60 * 1000;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const SHORT_MONTHS = "ene feb mar abr may jun jul ago sep oct nov dic".split(
  " ",
);
const COMMA_DECIMALS = { thousands: ".", decimal: "," };
const POINT_DECIMALS = { thousands: ",", decimal: "." };

// [date, description, amount in cents, extra]: `extra.reference` for the
// layouts with a reference, `extra.branch` for the one with a branch.
const OPENING = 321_040_000;
const SEPTEMBER = [
  [
    "2026-09-02",
    "COMPRA POS SUPERMERCADO EL ARCO",
    -8_540_000,
    { branch: "0102" },
  ],
  ["2026-09-03", "ABONO NOMINA EMPRESA ABC", 420_000_000],
  ["2026-09-05", "PAGO TARJETA CREDITO", -115_000_000],
  ["2026-09-08", "RETIRO CAJERO CENTRO", -30_000_000, { branch: "0215" }],
  ["2026-09-08", "GMF 4X1000", -120_000],
  [
    "2026-09-12",
    "TRANSFERENCIA A NEQUI",
    -5_000_000,
    { reference: "3001234567" },
  ],
  [
    "2026-09-15",
    "PAGO PSE EMPRESA DE ENERGIA",
    -18_250_000,
    { reference: "612345678" },
  ],
  ["2026-09-21", "COMPRA EN LINEA PEDIDO 12345678", -6_490_000],
  ["2026-09-25", "INTERESES AHORRO", 1_215],
  ["2026-09-30", "ABONO TRANSFERENCIA PRUEBA", 25_000_000],
];

const pad = (number) => String(number).padStart(2, "0");
const partsOf = (date) => date.split("-").map(Number);
const dayMonthYear = (date) => {
  const [year, month, day] = partsOf(date);
  return `${pad(day)}/${pad(month)}/${year}`;
};
const dayShortMonthYear = (date) => {
  const [year, month, day] = partsOf(date);
  return `${pad(day)}-${SHORT_MONTHS[month - 1]}-${year}`;
};
// A date cell at midnight, as Excel stores a day without a time.
const dateCell = (date) => {
  const [year, month, day] = partsOf(date);
  return {
    excelSerial: (Date.UTC(year, month - 1, day) - EXCEL_EPOCH) / DAY_MS,
  };
};

const group = (digits, separator) =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
const amountText = (cents, { thousands, decimal }) => {
  const pesos = Math.trunc(Math.abs(cents) / 100);
  const decimals = pad(Math.abs(cents) % 100);
  const sign = cents < 0 ? "-" : "";
  return `${sign}${group(String(pesos), thousands)}${decimal}${decimals}`;
};
const pesos = (cents) => cents / 100;
const sum = (amounts) => amounts.reduce((total, amount) => total + amount, 0);

// Each movement with the balance after it.
const withBalances = (movements) => {
  let balance = OPENING;
  return movements.map(([date, description, amount, extra = {}]) => {
    balance += amount;
    return { date, description, amount, balance, ...extra };
  });
};

const MOVEMENTS = withBalances(SEPTEMBER);
const totalOut = -sum(MOVEMENTS.map(({ amount }) => Math.min(amount, 0)));
const totalIn = sum(MOVEMENTS.map(({ amount }) => Math.max(amount, 0)));

// Money out and money in in columns of their own, an opening row and a
// branch to ignore, as v8-14 draws "Banco Horizonte"; a CSV, all text.
const outAndIn = () => [
  ["BANCO HORIZONTE"],
  ["Extracto de movimientos"],
  ["Cliente:", "ANA MARIA PRUEBA GOMEZ"],
  ["Cuenta de ahorros:", "12345678901"],
  ["Desde:", "01/09/2026", "Hasta:", "30/09/2026"],
  [],
  ["FECHA TRANS", "DETALLE", "OFICINA", "DEBITOS", "CREDITOS", "SALDO"],
  [
    "01/09/2026",
    "SALDO ANTERIOR",
    null,
    null,
    null,
    amountText(OPENING, COMMA_DECIMALS),
  ],
  ...MOVEMENTS.map(({ date, description, amount, balance, branch }) => [
    dayMonthYear(date),
    description,
    branch ?? "0001",
    amount < 0 ? amountText(-amount, COMMA_DECIMALS) : null,
    amount > 0 ? amountText(amount, COMMA_DECIMALS) : null,
    amountText(balance, COMMA_DECIMALS),
  ]),
  [],
  [
    "TOTALES",
    null,
    null,
    amountText(totalOut, COMMA_DECIMALS),
    amountText(totalIn, COMMA_DECIMALS),
  ],
  ["Este extracto es informativo."],
];

// A signed amount, newest first, with references: an XLSX with date cells
// and numbers.
const newestFirst = () => [
  ["Movimientos de tu cuenta"],
  [],
  ["Fecha transacción", "Concepto", "Referencia", "Monto", "Saldo disponible"],
  ...MOVEMENTS.toReversed().map(
    ({ date, description, amount, balance, reference }) => [
      dateCell(date),
      description,
      reference ?? null,
      pesos(amount),
      pesos(balance),
    ],
  ),
];

// An amount and the bank's word for its way, dates year first and a decimal
// point; a CSV whose header is its first row.
const withDirection = () => [
  ["FECHA", "DESCRIPCION", "TIPO", "VALOR", "SALDO"],
  ...MOVEMENTS.map(({ date, description, amount, balance }) => [
    date,
    description,
    amount < 0 ? "D" : "C",
    amountText(Math.abs(amount), POINT_DECIMALS),
    amountText(balance, POINT_DECIMALS),
  ]),
];

// Money out and in as numbers, dates with the month's name, and no balance.
const noBalance = () => [
  ["Cooperativa Andina - Movimientos"],
  [],
  ["Fecha", "Detalle", "Débitos", "Créditos"],
  ...MOVEMENTS.map(({ date, description, amount }) => [
    dayShortMonthYear(date),
    description,
    amount < 0 ? pesos(-amount) : null,
    amount > 0 ? pesos(amount) : null,
  ]),
];

// A signed amount after a second date and a document's number, under title
// rows with a date and an amount; a page's subtotal and its repeated header
// inside the table, and the totals and a note under it. A CSV, all text.
const TITLE_ROWS_HEADER = [
  "Fecha",
  "Fecha valor",
  "Descripción",
  "Documento",
  "Valor",
  "Saldo",
];
const titleRowsMovement = ({ date, description, amount, balance }, index) => [
  `${dayMonthYear(date)} 10:15`,
  dayMonthYear(date),
  description,
  String(4_500_000 + index).padStart(10, "0"),
  amountText(amount, COMMA_DECIMALS),
  amountText(balance, COMMA_DECIMALS),
];
const PAGE_SIZE = 5;
const titleRows = () => {
  const rows = MOVEMENTS.map(titleRowsMovement);
  const firstPage = MOVEMENTS.slice(0, PAGE_SIZE).map(({ amount }) => amount);
  return [
    ["BANCO DEL RIO"],
    ["Fecha de corte", "30/09/2026", "Saldo", "2.874.150,00"],
    [],
    TITLE_ROWS_HEADER,
    ...rows.slice(0, PAGE_SIZE),
    [
      null,
      null,
      "Subtotal página 1",
      null,
      amountText(sum(firstPage), COMMA_DECIMALS),
    ],
    TITLE_ROWS_HEADER,
    ...rows.slice(PAGE_SIZE),
    [],
    [
      null,
      null,
      "Total movimientos",
      null,
      amountText(totalIn - totalOut, COMMA_DECIMALS),
    ],
    ["Este documento no requiere firma."],
  ];
};

// As the extraction returns rows: without their empty cells at the end.
const trimmed = (rows) =>
  rows.map((row) =>
    row.slice(0, row.findLastIndex((cell) => cell !== null) + 1),
  );

/** Each mapped fixture's rows, by its name. */
export const mappedFixtures = () => ({
  "mapped-out-in": trimmed(outAndIn()),
  "mapped-newest-first": trimmed(newestFirst()),
  "mapped-direction": trimmed(withDirection()),
  "mapped-no-balance": trimmed(noBalance()),
  "mapped-title-rows": trimmed(titleRows()),
});
