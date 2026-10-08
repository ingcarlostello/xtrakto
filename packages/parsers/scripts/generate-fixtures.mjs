// Generates the synthetic Bancolombia fixtures in fixtures/: the content
// extractSpreadsheet returns for each export, following Appendix A of
// docs/ROADMAP.md, from the invented data in fixture-data.mjs. Balances and
// totals are computed here, so every statement reconciles except
// quarterly-broken-balance, and a fixed seed makes quarterly-large repeatable.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ACCOUNT,
  BASIC_MOVEMENTS,
  HOLDER,
  INTEREST,
  LARGE_TEMPLATES,
  OCTOBER_MOVEMENTS,
  ROLLOVER_MOVEMENTS,
} from "./fixture-data.mjs";

const FIXTURES_DIR = join(import.meta.dirname, "..", "fixtures");
const SHEET_NAME = "Hoja1";
const DAY_MS = 24 * 60 * 60 * 1000;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
// The movements export stores local midnight in Bogotá as 05:00 UTC.
const FIVE_AM = 5 / 24;
const QUARTER = { from: "2026-06-30", to: "2026-09-30" };

const SUMMARY_HEADER = [
  "SALDO ANTERIOR",
  "TOTAL ABONOS",
  "TOTAL CARGOS",
  "SALDO ACTUAL",
  "SALDO PROMEDIO",
  "CUPO SUGERIDO",
  "INTERESES",
  "RETEFUENTE",
];
const MOVEMENTS_HEADER = [
  "FECHA",
  "DESCRIPCIÓN",
  "SUCURSAL",
  "DCTO.",
  "VALOR",
  "SALDO",
];

const toUtc = (date) => {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};
const addDays = (date, days) =>
  new Date(toUtc(date) + days * DAY_MS).toISOString().slice(0, 10);
const dayMonth = (date) => `${Number(date.slice(8))}/${date.slice(5, 7)}`;
const slashDate = (date) => date.replaceAll("-", "/");
const excelSerial = (date) => (toUtc(date) - EXCEL_EPOCH) / DAY_MS + FIVE_AM;

const groupThousands = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// As the bank prints amounts: "-15,000.00", and ".85" or ".00" under one peso.
const amountText = (cents) => {
  const pesos = Math.trunc(Math.abs(cents) / 100);
  const decimals = String(Math.abs(cents) % 100).padStart(2, "0");
  const sign = cents < 0 ? "-" : "";
  return `${sign}${pesos === 0 ? "" : groupThousands(String(pesos))}.${decimals}`;
};
// The average balance is printed without decimals.
const wholeAmountText = (cents) =>
  groupThousands(String(Math.round(cents / 100)));

const sum = (amounts) => amounts.reduce((total, amount) => total + amount, 0);

// The summary is the bank's: a misprinted amount doesn't change it. TOTAL
// CARGOS is printed as a positive amount.
const summaryRow = (opening, movements) => {
  const amounts = movements.map(([, , amount]) => amount);
  const closing = opening + sum(amounts);
  const interest = movements.filter(
    ([, description]) => description === INTEREST,
  );
  return [
    amountText(opening),
    amountText(sum(amounts.filter((amount) => amount > 0))),
    amountText(-sum(amounts.filter((amount) => amount < 0))),
    amountText(closing),
    wholeAmountText((opening + closing) / 2),
    ".00",
    amountText(sum(interest.map(([, , amount]) => amount))),
    ".00",
  ];
};

const movementRows = (opening, movements) => {
  let balance = opening;
  return movements.map(([date, description, amount, extra = {}]) => {
    balance += amount;
    return [
      dayMonth(date),
      description,
      extra.branch ?? null,
      null,
      amountText(extra.printedAmount ?? amount),
      amountText(balance),
    ];
  });
};

// Every page starts with these blocks. On later pages they follow the last
// movement directly, and the DESDE header puts SUCURSAL in the VALOR column.
const pageHeader = (period) => [
  ["Información Cliente:"],
  ["CLIENTE", "DIRECCIÓN", "CIUDAD"],
  HOLDER,
  [],
  ["Información General:"],
  ["DESDE", "HASTA", "TIPO CUENTA", "NRO CUENTA", "SUCURSAL"],
  [slashDate(period.from), slashDate(period.to), ...ACCOUNT],
  [],
];

// Only the first page has the summary.
const quarterlyStatement = ({
  period,
  opening,
  movements,
  pageSize = Infinity,
}) => {
  const nextPage = [...pageHeader(period), ["Movimientos:"], MOVEMENTS_HEADER];
  return [
    [],
    ...pageHeader(period),
    ["Resumen:"],
    SUMMARY_HEADER,
    summaryRow(opening, movements),
    [],
    ["Movimientos:"],
    MOVEMENTS_HEADER,
    ...movementRows(opening, movements).flatMap((row, index) =>
      index > 0 && index % pageSize === 0 ? [...nextPage, row] : [row],
    ),
    [null, "FIN ESTADO DE CUENTA"],
  ];
};

// Newest first, as the bank lists them; within a day, the latest row first.
const movementsExport = (movements) => [
  ["Fecha", "Descripción", "Referencia", "Valor"],
  ...movements
    .map((movement, index) => ({ movement, index }))
    .sort(
      (a, b) => b.movement[0].localeCompare(a.movement[0]) || b.index - a.index,
    )
    .map(({ movement: [date, description, amount, extra = {}] }) => [
      { excelSerial: excelSerial(date) },
      description,
      extra.reference ?? null,
      amount / 100,
    ]),
];

// The export dates interest rows one day later than the quarterly statement,
// but never after the last day of the requested range.
const asExported =
  (lastDay) =>
  ([date, description, ...rest]) => {
    const next = addDays(date, 1);
    const exported = next > lastDay ? lastDay : next;
    return [description === INTEREST ? exported : date, description, ...rest];
  };

const withMisprint = (movements, index, printedAmount) =>
  movements.map((movement, current) =>
    current === index
      ? [...movement.slice(0, 3), { ...movement[3], printedAmount }]
      : movement,
  );

// mulberry32: a small seeded generator, so quarterly-large repeats exactly.
const seededRandom = (seed) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

// One interest row a day, a salary on the 10th and up to eight random
// movements a day that never take the balance below zero.
const largeMovements = (opening) => {
  const random = seededRandom(20_261_008);
  const movements = [];
  let balance = opening;
  const add = (movement) => {
    movements.push(movement);
    balance += movement[2];
  };
  for (let date = "2026-07-01"; date <= QUARTER.to; date = addDays(date, 1)) {
    add([date, INTEREST, Math.round((balance * 12) / 10_000_000)]);
    if (date.endsWith("-10")) {
      add([date, "PAGO INTERBANC EMPRESA EJEMPLO", 320_000_000]);
    }
    for (let count = Math.floor(random() * 9); count > 0; count--) {
      const [description, min, max, extra] =
        LARGE_TEMPLATES[Math.floor(random() * LARGE_TEMPLATES.length)];
      const amount = Math.round((min + random() * (max - min)) * 100);
      if (balance + amount >= 0) add([date, description, amount, extra]);
    }
  }
  return movements;
};

const renderCell = (cell) =>
  cell !== null && typeof cell === "object"
    ? `{ "excelSerial": ${cell.excelSerial} }`
    : JSON.stringify(cell);

// One spreadsheet row per line, so a fixture reads like the sheet.
const render = (rows) =>
  [
    "{",
    '  "type": "spreadsheet",',
    '  "sheets": [',
    "    {",
    `      "name": ${JSON.stringify(SHEET_NAME)},`,
    '      "rows": [',
    rows
      .map((row) => `        [${row.map(renderCell).join(", ")}]`)
      .join(",\n"),
    "      ]",
    "    }",
    "  ]",
    "}",
    "",
  ].join("\n");

const basic = {
  period: QUARTER,
  opening: 245_000_000,
  movements: BASIC_MOVEMENTS,
};
const fixtures = {
  "quarterly-basic": quarterlyStatement(basic),
  "quarterly-year-rollover": quarterlyStatement({
    period: { from: "2026-12-31", to: "2027-03-31" },
    opening: 120_000_000,
    movements: ROLLOVER_MOVEMENTS,
  }),
  "quarterly-repeated-header": quarterlyStatement({
    ...basic,
    pageSize: 14,
  }),
  "quarterly-broken-balance": quarterlyStatement({
    ...basic,
    movements: withMisprint(BASIC_MOVEMENTS, 5, -4_509_000),
  }),
  "quarterly-large": quarterlyStatement({
    period: QUARTER,
    opening: 500_000_000,
    movements: largeMovements(500_000_000),
    pageSize: 50,
  }),
  "movements-basic": movementsExport(
    OCTOBER_MOVEMENTS.map(asExported("2026-10-07")),
  ),
  "movements-overlap": movementsExport(
    BASIC_MOVEMENTS.filter(([date]) => date.startsWith("2026-07")).map(
      asExported("2026-07-31"),
    ),
  ),
};

mkdirSync(FIXTURES_DIR, { recursive: true });
for (const [name, rows] of Object.entries(fixtures)) {
  writeFileSync(join(FIXTURES_DIR, `${name}.json`), render(rows));
}
