import { describe, expect, it } from "vitest";
import type { ExtractedContent, ParsedStatement } from "@xtrakto/core";
import {
  readPrivateCardExports,
  readPrivateCardPdfs,
} from "../../fixtures/private-exports.mjs";
import { extractPdf } from "../extraction/pdf-extraction.helpers";
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
import { minimizeCardPdf } from "./card-pdf-minimize.helpers";
import { bancolombiaCardPdfParser } from "./card-pdf-parser.helpers";

// The human's Bancolombia card statements in Excel and PDF, in the
// git-ignored fixtures/private/tarjeta/ (Stage 12). Assertions only compare
// counts, codes, field names and yes/no answers, so a failure never prints a
// value of them.

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

    it("reads each one's rate for purchases in installments (12.4b)", () => {
      for (const statement of statements) {
        expect(
          statement?.ok && statement.value.card?.purchaseRatePpm !== undefined,
        ).toBe(true);
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

const pdfContents = await Promise.all(
  (await readPrivateCardPdfs()).map(async (bytes) => {
    const content = await extractPdf(bytes);
    return content.ok ? content.value : undefined;
  }),
);
const pdfStatements = pdfContents.map((content) =>
  content === undefined ? undefined : bancolombiaCardPdfParser.parse(content),
);

// A statement without what tells its formats apart: its format's id, and
// where each movement sits in its file.
const comparable = (statement: ParsedStatement): Record<string, unknown> => ({
  ...statement,
  formatId: "",
  transactions: statement.transactions.map((transaction) => ({
    ...transaction,
    sourceRow: 0,
  })),
});

// The fields two statements read differently, by name: never a value.
const differingFields = (a: ParsedStatement, b: ParsedStatement): string[] => {
  const [left, right] = [comparable(a), comparable(b)];
  return Object.keys({ ...left, ...right }).filter(
    (key) => JSON.stringify(left[key]) !== JSON.stringify(right[key]),
  );
};

// The spreadsheet of the same card and period.
const spreadsheetOf = (statement: ParsedStatement) =>
  statements.flatMap((other) =>
    other?.ok &&
    other.value.accountLast4 === statement.accountLast4 &&
    JSON.stringify(other.value.period) === JSON.stringify(statement.period)
      ? [other.value]
      : [],
  )[0];

describe.skipIf(pdfContents.length === 0)(
  "the human's Bancolombia card statements in PDF",
  () => {
    it("extracts and recognizes every file", () => {
      expect(
        pdfContents.filter(
          (content) =>
            content === undefined ||
            !bancolombiaCardPdfParser.canParse(content),
        ).length,
      ).toBe(0);
    });

    it("parses each as its spreadsheet, every field but where each movement sits, reconciled to the cent", () => {
      let compared = 0;
      for (const statement of pdfStatements) {
        expect(statement?.ok).toBe(true);
        if (!statement?.ok) continue;
        expect(
          reconcile(statement.value).issues.map(({ code }) => code),
        ).toEqual([]);
        const spreadsheet = spreadsheetOf(statement.value);
        if (spreadsheet === undefined) continue;
        compared += 1;
        expect(differingFields(statement.value, spreadsheet)).toEqual([]);
      }
      expect(compared).toBeGreaterThan(0);
    });

    it("parses each minimized exactly as the original, minimized once and for all", () => {
      const different = pdfContents.filter((content) => {
        if (content === undefined) return false;
        const minimized = minimizeCardPdf(content);
        return (
          JSON.stringify(bancolombiaCardPdfParser.parse(minimized)) !==
            JSON.stringify(bancolombiaCardPdfParser.parse(content)) ||
          JSON.stringify(minimizeCardPdf(minimized)) !==
            JSON.stringify(minimized)
        );
      });

      expect(different.length).toBe(0);
    });

    it("sends neither the address, the city nor the department, nor a long number", () => {
      const unread = contents.flatMap((content) =>
        content === undefined
          ? []
          : unreadClientTexts(cardSheets(content)?.pesos ?? []),
      );
      for (const content of pdfContents) {
        if (content === undefined) continue;
        const held = JSON.stringify(content);
        const sent = JSON.stringify(minimizeCardPdf(content));

        expect(unread.filter((text) => held.includes(text)).length).toBe(
          unread.length,
        );
        expect(unread.filter((text) => sent.includes(text)).length).toBe(0);
        expect(LONG_NUMBER.test(sent.replaceAll(AMOUNT, ""))).toBe(false);
      }
    });
  },
);
