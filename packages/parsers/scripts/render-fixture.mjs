// Writes a spreadsheet fixture as JSON for generate-fixtures.mjs: one row per
// line, so a fixture reads like its sheets.

const renderCell = (cell) =>
  cell !== null && typeof cell === "object"
    ? `{ "excelSerial": ${cell.excelSerial} }`
    : JSON.stringify(cell);

const renderSheet = ({ name, rows }) =>
  [
    "    {",
    `      "name": ${JSON.stringify(name)},`,
    '      "rows": [',
    rows
      .map((row) => `        [${row.map(renderCell).join(", ")}]`)
      .join(",\n"),
    "      ]",
    "    }",
  ].join("\n");

/** A spreadsheet's extracted content, sheet after sheet, as fixture JSON. */
export const renderBook = (sheets) =>
  [
    "{",
    '  "type": "spreadsheet",',
    '  "sheets": [',
    sheets.map(renderSheet).join(",\n"),
    "  ]",
    "}",
    "",
  ].join("\n");
