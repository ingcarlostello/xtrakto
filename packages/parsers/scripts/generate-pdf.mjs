// Writes real PDFs from the synthetic fixtures into fixtures/pdf/, which git
// ignores, for manual checks of the upload screen: every PDF fixture as a
// file, two of them locked with one invented password and one with another,
// and the PDFs the app must explain: scanned, over 30 pages, damaged, and one
// that isn't a statement. Invented data only. Run with
// `pnpm --filter @xtrakto/parsers generate:pdf`.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stdout } from "node:process";
import { contentToPdf, scannedPdf } from "../fixtures/pdf-writer.mjs";

const FIXTURES_DIR = join(import.meta.dirname, "..", "fixtures");
const OUTPUT_DIR = join(FIXTURES_DIR, "pdf");
const KB = 1024;
// Invented, as a document number looks: the two locked statements share one.
const PASSWORD = "1020304050";
const OTHER_PASSWORD = "5060708090";
const TOO_MANY_PAGES = 31;

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES_DIR, `${name}.json`), "utf8"));

// The PDF fixtures, by their names without "-pdf".
const pdfFixtures = () =>
  readdirSync(FIXTURES_DIR)
    .filter((file) => file.endsWith("-pdf.json"))
    .map((file) => file.slice(0, -"-pdf.json".length))
    .sort();

const pdf = (pages) => ({ type: "pdf", pages });

const textAt = (str, y) => ({
  str,
  x: 72,
  y,
  width: str.length * 6,
  height: 10,
});

const SHOPPING_LIST = pdf([
  {
    items: ["Lista de mercado", "Arroz", "Leche", "Pan"].map((str, index) =>
      textAt(str, 100 + 20 * index),
    ),
  },
]);

const MANY_PAGES = pdf(
  Array.from({ length: TOO_MANY_PAGES }, (_, index) => ({
    items: [textAt(`Página ${index + 1}`, 100)],
  })),
);

const writeOutput = (name, bytes) => {
  writeFileSync(join(OUTPUT_DIR, name), bytes);
  return { name, bytes: bytes.length };
};

const fixtureFiles = () =>
  Promise.all(
    pdfFixtures().map(async (name) =>
      writeOutput(
        `${name}.pdf`,
        await contentToPdf(readFixture(`${name}-pdf`)),
      ),
    ),
  );

const lockedFiles = async () => [
  writeOutput(
    "quarterly-basic-locked.pdf",
    await contentToPdf(readFixture("quarterly-basic-pdf"), {
      userPassword: PASSWORD,
    }),
  ),
  writeOutput(
    "movements-overlap-locked.pdf",
    await contentToPdf(readFixture("movements-overlap-pdf"), {
      userPassword: PASSWORD,
    }),
  ),
  writeOutput(
    "quarterly-large-other-password.pdf",
    await contentToPdf(readFixture("quarterly-large-pdf"), {
      userPassword: OTHER_PASSWORD,
    }),
  ),
];

const rejectedFiles = async () => {
  const basic = await contentToPdf(readFixture("quarterly-basic-pdf"));
  return [
    writeOutput("scanned.pdf", await scannedPdf(2)),
    writeOutput("too-many-pages.pdf", await contentToPdf(MANY_PAGES)),
    writeOutput("damaged.pdf", basic.slice(0, Math.floor(basic.length / 2))),
    writeOutput("not-a-statement.pdf", await contentToPdf(SHOPPING_LIST)),
  ];
};

mkdirSync(OUTPUT_DIR, { recursive: true });
const written = [
  ...(await fixtureFiles()),
  ...(await lockedFiles()),
  ...(await rejectedFiles()),
];
for (const { name, bytes } of written)
  stdout.write(`${name}: ${Math.ceil(bytes / KB)} KB\n`);
