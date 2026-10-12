// Writes extracted content back as an XLSX file, stored the way the bank's
// exports store it: text, numbers, and date serials as numbers with a date
// format. Plain JavaScript for scripts/generate-xlsx.mjs and its round-trip
// test; xlsx-writer.d.mts gives it a type. Invented content only.
import { utils, write } from "xlsx";

// Any date format makes the extraction read the number as a date serial.
const DATE_FORMAT = "dd/mm/yyyy hh:mm";

const toCell = (cell) => {
  if (typeof cell === "string") return { t: "s", v: cell };
  if (typeof cell === "number") return { t: "n", v: cell };
  return { t: "n", v: cell.excelSerial, z: DATE_FORMAT };
};

// Empty cells are left out, as Excel leaves them.
const toWorksheet = (rows) => {
  const sheet = {};
  rows.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell !== null) sheet[utils.encode_cell({ r, c })] = toCell(cell);
    }),
  );
  const lastColumn = rows.reduce(
    (last, row) => Math.max(last, row.length - 1),
    0,
  );
  sheet["!ref"] = utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: Math.max(0, rows.length - 1), c: lastColumn },
  });
  return sheet;
};

export const contentToXlsx = (content) => {
  const book = utils.book_new();
  for (const { name, rows } of content.sheets)
    utils.book_append_sheet(book, toWorksheet(rows), name);
  // Compressed, as Excel writes it: the size is what the upload limit checks.
  return new Uint8Array(
    write(book, { type: "array", bookType: "xlsx", compression: true }),
  );
};
