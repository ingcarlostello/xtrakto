import { describe, expect, it } from "vitest";
import type { ExtractedContent } from "@xtrakto/core";
import { readPrivateCardExports } from "../../fixtures/private-exports.mjs";
import { extractSpreadsheet } from "../extraction/spreadsheet-extraction.helpers";
import { reconcile } from "../reconciliation/reconciliation.helpers";
import {
  cellText,
  findColumns,
  findLabelRow,
  type SheetRows,
} from "../sheets/sheet.utils";
import { QUARTERLY_BLOCK } from "./bancolombia.constants";
import { cardSheets } from "./card-header.helpers";
import { minimizeCard } from "./card-minimize.helpers";
import { bancolombiaCardParser } from "./card-parser.helpers";

// The human's Bancolombia card statements in Excel, in the git-ignored
// fixtures/private/tarjeta/ (Stage 12). Assertions only compare counts,
// codes and yes/no answers, so a failure never prints a value of them.

const LONG_NUMBER = /\d{6,}/;
// Amounts as the sheet writes them, whose digits aren't a number to hide.
const AMOUNT = /-?\d{1,3}(?:[.,]\d{3})+[.,]\d{1,2}/g;

const contents = (await readPrivateCardExports()).map((bytes) => {
  const content = extractSpreadsheet(bytes);
  return content.ok ? content.value : undefined;
});
const statements = contents.map((content) =>
  content === undefined ? undefined : bancolombiaCardParser.parse(content),
);

// The texts of the client block the parser never reads: the address, the
// city and the department, wherever the sheet in pesos prints them.
const unreadClientTexts = (rows: SheetRows): string[] => {
  const label = findLabelRow(rows, QUARTERLY_BLOCK.CLIENT);
  if (label === undefined) return [];
  const columns = findColumns(rows[label + 1] ?? [], {
    ADDRESS: "Dirección",
    CITY: "Ciudad",
    DEPARTMENT: "Departamento",
  });
  if (!columns.ok) return [];
  return columns.value.flatMap(({ index }) => {
    const text = cellText(rows[label + 2]?.[index]);
    return text === undefined ? [] : [text];
  });
};

const sentOf = (content: ExtractedContent) =>
  JSON.stringify(minimizeCard(content));

describe.skipIf(contents.length === 0)(
  "the human's Bancolombia card statements",
  () => {
    it("extracts and recognizes every file", () => {
      expect(
        contents.filter(
          (content) =>
            content === undefined || !bancolombiaCardParser.canParse(content),
        ).length,
      ).toBe(0);
    });

    it("parses and reconciles each to the cent", () => {
      for (const statement of statements) {
        expect(statement?.ok).toBe(true);
        if (!statement?.ok) continue;
        expect(
          reconcile(statement.value).issues.map(({ code }) => code),
        ).toEqual([]);
        expect(statement.value.warnings.length).toBe(0);
      }
    });

    it("parses each minimized exactly as the original", () => {
      const different = contents.filter(
        (content) =>
          content !== undefined &&
          JSON.stringify(bancolombiaCardParser.parse(minimizeCard(content))) !==
            JSON.stringify(bancolombiaCardParser.parse(content)),
      );

      expect(different.length).toBe(0);
    });

    it("sends neither the address, the city nor the department, nor a long number", () => {
      for (const content of contents) {
        if (content === undefined) continue;
        const sent = sentOf(content);
        const unread = unreadClientTexts(cardSheets(content)?.pesos ?? []);

        expect(unread.length).toBeGreaterThan(0);
        expect(unread.filter((text) => sent.includes(text)).length).toBe(0);
        expect(LONG_NUMBER.test(sent.replaceAll(AMOUNT, ""))).toBe(false);
      }
    });
  },
);
