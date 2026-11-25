import { describe, expect, it } from "vitest";
import {
  CATEGORIZATION_RULES,
  categorizeByRules,
  categoryKind,
} from "@xtrakto/core";
import type {
  CategorizationRuleId,
  ExtractedContent,
  ParsedTransaction,
  RuleCategorization,
} from "@xtrakto/core";
import {
  readPrivateCardExports,
  readPrivateCardPdfs,
  readPrivateNuCardPdfs,
} from "../../fixtures/private-exports.mjs";
import { extractPdf } from "../extraction/pdf-extraction.helpers";
import { extractSpreadsheet } from "../extraction/spreadsheet-extraction.helpers";
import { findParser } from "../registry/default-registry.helpers";

// The human's card statements of fixtures/private/ (Stage 12) through the
// rules on a card's account (12.3a). Nu's open only with NU_PDF_PASSWORD, as
// in their own private test. The report is whole percentages only, and the
// assertions compare counts and rule ids, so nothing of a real movement is
// ever printed.

type Categorized = {
  readonly movement: ParsedTransaction;
  readonly result: RuleCategorization | null;
};

// Texts the banks always print, or Nu's parser writes, and the rule each one
// must get.
const FIXED_TEXTS: readonly (readonly [
  text: string,
  isMoneyIn: boolean,
  ruleId: CategorizationRuleId,
])[] = [
  ["INTERESES DE MORA", false, "card_late_interest"],
  ["INTERESES CORRIENTES", false, "card_interest"],
  ["INTERESES", false, "card_interest"],
  ["COMISION POR CAMBIO DE MONEDA", false, "card_conversion"],
  ["COMPRA DE CARTERA", false, "card_balance_transfer"],
  ["ABONO SUCURSAL VIRTUAL", true, "card_payment_received"],
  ["GRACIAS POR TU PAGO", true, "card_payment_received"],
];

// Read only here, by a test Turborepo never runs (`test:private`).
// eslint-disable-next-line turbo/no-undeclared-env-vars
const password = process.env["NU_PDF_PASSWORD"];
const nuFiles = password === undefined ? [] : await readPrivateNuCardPdfs();
const contents: ExtractedContent[] = [
  ...(await readPrivateCardExports()).map(extractSpreadsheet),
  ...(await Promise.all(
    (await readPrivateCardPdfs()).map((bytes) => extractPdf(bytes)),
  )),
  ...(await Promise.all(
    nuFiles.map((bytes) => extractPdf(bytes, { password })),
  )),
].flatMap((content) => (content.ok ? [content.value] : []));

const categorized: readonly Categorized[] = contents.flatMap((content) => {
  const parser = findParser(content);
  const statement = parser.ok ? parser.value.parse(content) : undefined;
  if (!statement?.ok) return [];
  return statement.value.transactions.map((movement) => ({
    movement,
    result: categorizeByRules(movement, { accountType: "credit_card" }),
  }));
});

// Whole percentages, and "<1%" for a share that isn't zero.
const percent = (part: number, total: number) => {
  const rounded = total === 0 ? 0 : Math.round((100 * part) / total);
  return part > 0 && rounded === 0 ? "<1%" : `${rounded}%`;
};

const isMoneyIn = ({ amountMinor }: ParsedTransaction) => amountMinor > 0;

// As the rules read a text: without case or accents.
const folded = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();

const startsWithText = (
  { descriptionNormalized }: ParsedTransaction,
  text: string,
) => folded(descriptionNormalized).startsWith(text);

const hasWrongKind = ({ movement, result }: Categorized) => {
  const kind = result && categoryKind(result.categoryId);
  return isMoneyIn(movement) ? kind === "spending" : kind === "income";
};

describe.skipIf(categorized.length === 0)(
  "real card movements and the rules",
  () => {
    it("reports the share of movements each rule takes", async ({
      annotate,
    }) => {
      const shares = CATEGORIZATION_RULES.flatMap(({ id }) => {
        const taken = categorized.filter(({ result }) => result?.ruleId === id);
        return taken.length === 0
          ? []
          : [`${id} ${percent(taken.length, categorized.length)}`];
      });
      const without = categorized.filter(({ result }) => result === null);
      await annotate(
        `${shares.join(", ")}; sin categoría ${percent(without.length, categorized.length)}`,
        "reglas en tarjetas",
      );

      expect(categorized.length).toBeGreaterThan(0);
    });

    it("gives every movement a category: money out is a purchase at least", () => {
      expect(categorized.filter(({ result }) => result === null).length).toBe(
        0,
      );
    });

    it("never gives money out an income category, nor money in a spending one", () => {
      expect(categorized.filter(hasWrongKind).length).toBe(0);
    });

    it.each(FIXED_TEXTS)(
      "gives every movement starting with %j its rule",
      (text, isIn, ruleId) => {
        const others = categorized
          .filter(
            ({ movement }) =>
              startsWithText(movement, text) && isMoneyIn(movement) === isIn,
          )
          .map(({ result }) => result?.ruleId ?? null)
          // "INTERESES" also starts late interest, which has a rule of its own.
          .filter(
            (other) => other !== ruleId && other !== "card_late_interest",
          );

        expect(others).toEqual([]);
      },
    );
  },
);
