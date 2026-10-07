// Generates src/categories.constants.ts from categories.json, so TypeScript
// gets literal types for category ids and kinds. The output is already in
// Prettier's style: objects that start with a line break stay expanded.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PACKAGE_DIR = join(import.meta.dirname, "..");
const SOURCE = join(PACKAGE_DIR, "categories.json");
const TARGET = join(PACKAGE_DIR, "src", "categories.constants.ts");

const { kinds, categories } = JSON.parse(readFileSync(SOURCE, "utf8"));

const quote = (value) => JSON.stringify(value);

const renderCategory = ({ id, labelEs, kind }) =>
  [
    "  {",
    `    id: ${quote(id)},`,
    `    labelEs: ${quote(labelEs)},`,
    `    kind: ${quote(kind)},`,
    "  },",
  ].join("\n");

const output = `// Generated from categories.json by \`pnpm --filter @xtrakto/core generate:categories\`. Do not edit.

export const CATEGORY_KINDS = [${kinds.map(quote).join(", ")}] as const;

export const CATEGORIES = [
${categories.map(renderCategory).join("\n")}
] as const;
`;

writeFileSync(TARGET, output);
