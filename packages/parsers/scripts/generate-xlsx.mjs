// Writes real files from the synthetic fixtures into fixtures/xlsx/, which git
// ignores, for manual checks of the upload screens: every fixture as XLSX,
// quarterly statements under other account numbers (so they don't land on the
// seeded account), files the app must reject, and one of about 10 MB. Invented
// data only. Run with `pnpm --filter @xtrakto/parsers generate:xlsx`.
import { Buffer } from "node:buffer";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stdout } from "node:process";
import { contentToXlsx } from "../fixtures/xlsx-writer.mjs";

const FIXTURES_DIR = join(import.meta.dirname, "..", "fixtures");
const OUTPUT_DIR = join(FIXTURES_DIR, "xlsx");
const FIXTURE_ACCOUNT = "12345678901";
const MB = 1024 * 1024;
// The extraction's bounds (packages/core): every filler sheet stays inside.
const MAX_ROWS = 10_000;

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES_DIR, `${name}.json`), "utf8"));

const fixtureNames = () =>
  readdirSync(FIXTURES_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -".json".length))
    .sort();

const spreadsheet = (sheets) => ({ type: "spreadsheet", sheets });

// The same statement under another invented account number.
const withAccount = (content, account) =>
  spreadsheet(
    content.sheets.map(({ name, rows }) => ({
      name,
      rows: rows.map((row) =>
        row.map((cell) => (cell === FIXTURE_ACCOUNT ? account : cell)),
      ),
    })),
  );

// mulberry32, as in generate-fixtures.mjs: the same filler on every run.
const seededRandom = (seed) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const LETTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ";

const randomText = (random, length) =>
  Array.from(
    { length },
    () => LETTERS[Math.floor(random() * LETTERS.length)],
  ).join("");

// Sheets of random text that compress badly, to make a file heavy while its
// content stays within the extraction's bounds.
const fillerSheets = ({ count, cells, length }) => {
  const random = seededRandom(20_261_011);
  return Array.from({ length: count }, (_, sheet) => ({
    name: `Relleno ${sheet + 1}`,
    rows: Array.from({ length: MAX_ROWS }, () =>
      Array.from({ length: cells }, () => randomText(random, length)),
    ),
  }));
};

const heavyQuarterly = (filler) =>
  spreadsheet([
    readFixture("quarterly-large").sheets[0],
    ...fillerSheets(filler),
  ]);

// Not a bank statement: a shopping list.
const SHOPPING_LIST = spreadsheet([
  {
    name: "Mercado",
    rows: [
      ["Producto", "Cantidad"],
      ["Arroz", 2],
      ["Leche", 6],
      ["Huevos", 30],
    ],
  },
]);

const TOO_MANY_ROWS = spreadsheet([
  {
    name: "Datos",
    rows: [
      ["Fila", "Valor"],
      ...Array.from({ length: MAX_ROWS }, (_, row) => [`Fila ${row + 1}`, row]),
    ],
  },
]);

// Enough of a PDF to be recognized as one: binary, with zero bytes.
const PDF_BYTES = Buffer.concat([
  Buffer.from("%PDF-1.4\n%"),
  Buffer.from([0xe2, 0xe3, 0xcf, 0xd3]),
  Buffer.from("\n1 0 obj << /Type /Catalog >> endobj\nstream\n"),
  Buffer.from([0x00, 0x01, 0x02, 0x03]),
  Buffer.from("\nendstream\ntrailer << /Root 1 0 R >>\n%%EOF\n"),
]);

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const DAY_MS = 24 * 60 * 60 * 1000;

const slashDate = ({ excelSerial }) => {
  const date = new Date(EXCEL_EPOCH + Math.floor(excelSerial) * DAY_MS);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${date.getUTCDate()}/${month}/${date.getUTCFullYear()}`;
};

// The export as Excel saves it to CSV in Colombia (Appendix A.2): `;`,
// d/mm/yyyy dates, decimal commas and Windows-1252.
const asExcelCsv = ({ sheets }) => {
  const [header, ...movements] = sheets[0].rows;
  const lines = movements.map(([date, description, reference, amount]) =>
    [
      slashDate(date),
      description,
      reference ?? "",
      String(amount).replace(".", ","),
    ].join(";"),
  );
  return Buffer.from([header.join(";"), ...lines, ""].join("\r\n"), "latin1");
};

const writeOutput = (name, bytes) => {
  writeFileSync(join(OUTPUT_DIR, name), bytes);
  return { name, bytes: bytes.length };
};

const fixtureFiles = () =>
  fixtureNames().map((name) =>
    writeOutput(`${name}.xlsx`, contentToXlsx(readFixture(name))),
  );

const accountVariants = () => [
  writeOutput(
    "quarterly-basic-account-2.xlsx",
    contentToXlsx(withAccount(readFixture("quarterly-basic"), "98765432109")),
  ),
  writeOutput(
    "quarterly-previous-account-2.xlsx",
    contentToXlsx(
      withAccount(readFixture("quarterly-previous"), "98765432109"),
    ),
  ),
  writeOutput(
    "quarterly-broken-balance-account-3.xlsx",
    contentToXlsx(
      withAccount(readFixture("quarterly-broken-balance"), "55500011103"),
    ),
  ),
];

const rejectedFiles = () => {
  const basic = contentToXlsx(readFixture("quarterly-basic"));
  return [
    writeOutput("not-a-statement.xlsx", contentToXlsx(SHOPPING_LIST)),
    writeOutput("damaged.xlsx", basic.slice(0, Math.floor(basic.length / 2))),
    writeOutput("renamed-pdf.xlsx", PDF_BYTES),
    writeOutput("extracto.pdf", PDF_BYTES),
    writeOutput("movements.csv", asExcelCsv(readFixture("movements-basic"))),
    writeOutput("too-many-rows.xlsx", contentToXlsx(TOO_MANY_ROWS)),
  ];
};

// A valid quarterly statement of about 9.5 MB, under the 10 MB limit, and a
// file over it.
const heavyFiles = () => [
  writeOutput(
    "quarterly-10mb.xlsx",
    contentToXlsx(heavyQuarterly({ count: 4, cells: 4, length: 46 })),
  ),
  writeOutput(
    "oversize-11mb.xlsx",
    contentToXlsx(heavyQuarterly({ count: 5, cells: 4, length: 46 })),
  ),
];

mkdirSync(OUTPUT_DIR, { recursive: true });
const written = [
  ...fixtureFiles(),
  ...accountVariants(),
  ...rejectedFiles(),
  ...heavyFiles(),
];
for (const { name, bytes } of written)
  stdout.write(`${name}: ${(bytes / MB).toFixed(2)} MB\n`);
