import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  CATEGORIZATION_RULES,
  categorizeByRules,
  channelOf,
} from "@xtrakto/core";
import type {
  CategorizationRuleId,
  ParsedStatement,
  ParsedTransaction,
  RuleCategorization,
} from "@xtrakto/core";
import { readPrivateExports } from "../../fixtures/private-exports.mjs";
import { extractSpreadsheet } from "../extraction/spreadsheet-extraction.helpers";
import { findParser } from "../registry/default-registry.helpers";
import {
  MOVEMENTS_EXPORT_FORMAT_ID,
  QUARTERLY_FORMAT_ID,
} from "./bancolombia.constants";

// The real exports of fixtures/private/ (Phase 2.8) through the rule-based
// categorizer (Phases 6.1a and 6.1b). The report is whole percentages only, as test
// annotations that the verbose reporter prints, and the assertions compare
// counts, so nothing of a real movement is ever printed.

type Categorized = {
  readonly movement: ParsedTransaction;
  readonly formatId: string;
  readonly result: RuleCategorization | null;
};

const FORMATS = [
  ["Extracto trimestral", QUARTERLY_FORMAT_ID],
  ["Movimientos", MOVEMENTS_EXPORT_FORMAT_ID],
] as const;

// Texts the bank always starts a description with, and the rule each one
// must get whatever comes before it in the table.
const FIXED_TEXTS: readonly (readonly [
  text: string,
  isMoneyIn: boolean,
  ruleId: CategorizationRuleId,
])[] = [
  ["ABONO INTERESES AHORROS", true, "savings_interest"],
  ["RETIRO CAJERO", false, "cash_withdrawal"],
  ["RETIRO CORRESPONSAL", false, "cash_withdrawal"],
  ["COMIS", false, "bank_fee"],
  ["AJUSTE", false, "bank_fee"],
  ["TRANSFERENCIAS A NEQUI", false, "nequi_out"],
  ["PAGO SUC VIRT TC", false, "card_payment"],
];
// The 4x1000 can appear anywhere in a description.
const TAX_TEXT = "4X1000";

const readStatement = (bytes: Uint8Array): ParsedStatement | undefined => {
  const content = extractSpreadsheet(bytes);
  if (!content.ok) return undefined;
  const parser = findParser(content.value);
  if (!parser.ok) return undefined;
  const statement = parser.value.parse(content.value);
  return statement.ok ? statement.value : undefined;
};

const statements = (await readPrivateExports())
  .map(readStatement)
  .filter((statement) => statement !== undefined);
const categorized: readonly Categorized[] = statements.flatMap(
  ({ formatId, transactions }) =>
    transactions.map((movement) => ({
      movement,
      formatId,
      result: categorizeByRules(movement),
    })),
);

// Whole percentages, and "<1%" for a share that isn't zero.
const percent = (part: number, total: number) => {
  const rounded = total === 0 ? 0 : Math.round((100 * part) / total);
  return part > 0 && rounded === 0 ? "<1%" : `${rounded}%`;
};

const shares = (rows: readonly Categorized[]) => {
  const withCategory = rows.filter(({ result }) => result !== null).length;
  const toReview = rows.filter(({ result }) => result?.isPendingReview).length;
  return `${percent(withCategory, rows.length)} con categoría, ${percent(toReview, rows.length)} por revisar`;
};

// Set below the first measurement (Phase 6.1a), to catch a rule that stops
// matching the bank's texts.
const MIN_CATEGORIZED_SHARE = 0.6;

// About 90 interest rows a quarter, which inflate the share with a category.
const isDailyInterest = ({ result }: Categorized) =>
  result?.ruleId === "savings_interest";

const KIND_OF = new Map(CATEGORIES.map(({ id, kind }) => [id, kind]));

const words = ({ descriptionNormalized }: ParsedTransaction) =>
  descriptionNormalized.toUpperCase().split(/[^A-Z0-9]+/);

const startsWithText = (movement: ParsedTransaction, text: string) => {
  const movementWords = words(movement);
  return text.split(" ").every((word, index) => movementWords[index] === word);
};

const isMoneyIn = ({ amountMinor }: ParsedTransaction) => amountMinor > 0;

const hasWrongKind = ({ movement, result }: Categorized) => {
  const kind = result && KIND_OF.get(result.categoryId);
  return movement.amountMinor < 0 ? kind === "income" : kind === "spending";
};

describe.skipIf(categorized.length === 0)(
  "real movements and the rules",
  () => {
    it("reports how many get a category and how many wait for review", async ({
      annotate,
    }) => {
      for (const [label, formatId] of FORMATS) {
        const rows = categorized.filter((row) => row.formatId === formatId);
        const withoutInterest = rows.filter((row) => !isDailyInterest(row));
        await annotate(
          `${label}: ${shares(rows)}; sin los intereses diarios, ${shares(withoutInterest)}`,
          "categorías",
        );
      }
      const withCategory = categorized.filter(({ result }) => result !== null);

      expect(withCategory.length / categorized.length).toBeGreaterThanOrEqual(
        MIN_CATEGORIZED_SHARE,
      );
    });

    it("reports the share of movements each rule takes", async ({
      annotate,
    }) => {
      const share = (ruleId: string) =>
        percent(
          categorized.filter(({ result }) => result?.ruleId === ruleId).length,
          categorized.length,
        );
      await annotate(
        CATEGORIZATION_RULES.map(({ id }) => `${id} ${share(id)}`).join(", "),
        "reglas",
      );
      expect(categorized.length).toBeGreaterThan(0);
    });

    it("reports which channels the movements without a category come from", async ({
      annotate,
    }) => {
      const without = categorized.filter(({ result }) => result === null);
      const byChannel = new Map<string, number>();
      for (const { movement } of without) {
        const label =
          channelOf(movement.descriptionNormalized)?.labelEs ?? "sin canal";
        byChannel.set(label, (byChannel.get(label) ?? 0) + 1);
      }
      await annotate(
        [...byChannel]
          .sort(([, a], [, b]) => b - a)
          .map(
            ([label, count]) =>
              `${label} ${percent(count, categorized.length)}`,
          )
          .join(", "),
        "sin categoría",
      );
      expect(without.length).toBeLessThan(categorized.length);
    });

    it("never gives money out an income category, nor money in a spending one", () => {
      expect(categorized.filter(hasWrongKind).length).toBe(0);
    });

    // Only the rules they got instead are compared, never their text.
    const otherRules = (rows: readonly Categorized[], ruleId: string) =>
      rows
        .map(({ result }) => result?.ruleId ?? null)
        .filter((other) => other !== ruleId);

    it.each(FIXED_TEXTS)(
      "gives every movement starting with %j its rule",
      (text, isIn, ruleId) => {
        const withText = categorized.filter(
          ({ movement }) =>
            startsWithText(movement, text) &&
            movement.amountMinor !== 0 &&
            isMoneyIn(movement) === isIn,
        );

        expect(otherRules(withText, ruleId)).toEqual([]);
      },
    );

    it("gives every 4x1000 charge its rule", () => {
      const charges = categorized.filter(
        ({ movement }) =>
          words(movement).includes(TAX_TEXT) && movement.amountMinor < 0,
      );

      expect(otherRules(charges, "gmf_tax")).toEqual([]);
    });
  },
);
