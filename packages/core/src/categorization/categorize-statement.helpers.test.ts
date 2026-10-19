import { describe, expect, it } from "vitest";
import { amountMinorSchema } from "../money/money.schemas";
import { prepareStatement } from "../statements/prepared-statement.helpers";
import { parsedStatementSchema } from "../statements/statement.schemas";
import {
  categorizeStatement,
  savedMovementCategory,
} from "./categorize-statement.helpers";
import type { CategorizationRuleId } from "./categorization.types";
import { compileUserRules } from "./user-rule.helpers";

const KEY = "test-key-with-at-least-32-characters!";

const movement = (description: string, amountMinor: number, row: number) => ({
  date: "2026-10-01",
  descriptionRaw: description,
  descriptionNormalized: description,
  amountMinor,
  sourceRow: row,
});

const DEFAULT_MOVEMENTS = [
  movement("TRANSFERENCIAS A NEQUI", -5_000_000, 3),
  movement("PAGO LLAVE Maria Lopez", -2_000_000, 2),
  // Money in that no rule knows.
  movement("ABONO EJEMPLO", 1_000_000, 1),
];

const prepared = (movements = DEFAULT_MOVEMENTS) =>
  prepareStatement(
    parsedStatementSchema.parse({
      bankId: "bancolombia",
      formatId: "bancolombia-movements-export",
      accountType: "savings",
      currency: "COP",
      period: { from: "2026-10-01", to: "2026-10-01" },
      periodSource: "rows",
      transactions: movements,
      warnings: [],
    }),
    KEY,
  );

describe("categorizeStatement", () => {
  it("gives each movement what the rules say about it", async () => {
    const { transactions } = categorizeStatement(await prepared());

    expect(
      transactions.map(
        ({ categoryId, categorySource, categoryRuleId, isPendingReview }) => ({
          categoryId,
          categorySource,
          categoryRuleId,
          isPendingReview,
        }),
      ),
    ).toEqual([
      {
        categoryId: "transfers_to_people",
        categorySource: "rule",
        categoryRuleId: "nequi_out",
        isPendingReview: false,
      },
      {
        categoryId: "transfers_to_people",
        categorySource: "rule",
        categoryRuleId: "key_payment",
        isPendingReview: true,
      },
      {
        categoryId: null,
        categorySource: null,
        categoryRuleId: null,
        isPendingReview: false,
      },
    ]);
  });

  it("reads the account's holder name it's given", async () => {
    const statement = await prepared([
      movement("TRANSF A ANA MARIA PRUEB", -1_000_000, 0),
    ]);
    const ruleOf = (holderName?: string) =>
      categorizeStatement(statement, { holderName }).transactions[0]
        ?.categoryRuleId;

    expect(ruleOf("ANA MARIA PRUEBA GOMEZ")).toBe("own_name_out_cut");
    expect(ruleOf()).toBe("transfer_out");
  });

  it("gives the user's category before the table's, never to review, keeping the rule that matched", async () => {
    const { transactions } = categorizeStatement(await prepared(), {
      userRules: [
        {
          target: "description",
          descriptionFolded: "PAGO LLAVE MARIA LOPEZ",
          direction: "out",
          categoryId: "restaurants",
        },
        {
          target: "description",
          descriptionFolded: "ABONO EJEMPLO",
          direction: "in",
          categoryId: "income_transfer",
        },
      ],
    });

    expect(
      transactions.map(
        ({ categoryId, categorySource, categoryRuleId, isPendingReview }) => ({
          categoryId,
          categorySource,
          categoryRuleId,
          isPendingReview,
        }),
      ),
    ).toEqual([
      {
        categoryId: "transfers_to_people",
        categorySource: "rule",
        categoryRuleId: "nequi_out",
        isPendingReview: false,
      },
      {
        categoryId: "restaurants",
        categorySource: "user",
        categoryRuleId: "key_payment",
        isPendingReview: false,
      },
      {
        categoryId: "income_transfer",
        categorySource: "user",
        categoryRuleId: null,
        isPendingReview: false,
      },
    ]);
  });

  it("keeps everything else the statement had, in its order", async () => {
    const statement = await prepared();
    const categorized = categorizeStatement(statement);

    expect(categorized.contentHash).toBe(statement.contentHash);
    expect(categorized.transactions).toMatchObject(statement.transactions);
  });
});

describe("savedMovementCategory", () => {
  // A key payment saved before, whose table rule guessed a payment to a person.
  const saved = (
    changes: Partial<Parameters<typeof savedMovementCategory>[0]> = {},
  ): Parameters<typeof savedMovementCategory>[0] => ({
    descriptionNormalized: "PAGO LLAVE Maria Lopez",
    amountMinor: amountMinorSchema.parse(-6_000_000),
    categoryRuleId: "key_payment",
    ...changes,
  });

  it("gives it the user's other rule first", () => {
    const rules = compileUserRules([
      {
        target: "description",
        descriptionFolded: "PAGO LLAVE MARIA LOPEZ",
        direction: "out",
        categoryId: "investment",
      },
    ]);

    expect(savedMovementCategory(saved(), rules)).toEqual({
      categoryId: "investment",
      categorySource: "user",
      isPendingReview: false,
    });
  });

  it("gives it a number's rule, which holds both ways for money that only moves", () => {
    const rules = compileUserRules([
      {
        target: "reference",
        referenceHash: "h1",
        categoryId: "own_account_transfer",
      },
    ]);
    const back = saved({
      descriptionNormalized: "TRANSFERENCIA DESDE NEQUI",
      amountMinor: amountMinorSchema.parse(2_000_000),
      referenceHash: "h1",
      categoryRuleId: "nequi_in",
    });

    expect(savedMovementCategory(back, rules)?.categorySource).toBe("user");
  });

  it.each([
    [
      "the table's guess, to review again",
      "key_payment" as const,
      {
        categoryId: "transfers_to_people",
        categorySource: "rule",
        isPendingReview: true,
      },
    ],
    [
      "the table's sure category",
      "transfer_out" as const,
      {
        categoryId: "transfers_to_people",
        categorySource: "rule",
        isPendingReview: false,
      },
    ],
    [
      "no category when no rule knew it",
      null,
      { categoryId: null, categorySource: null, isPendingReview: false },
    ],
  ])(
    "gives it back %s without a rule of the user's",
    (_, categoryRuleId, category) => {
      expect(
        savedMovementCategory(saved({ categoryRuleId }), compileUserRules([])),
      ).toEqual(category);
    },
  );

  it("leaves it as it is when the table no longer has its rule", () => {
    // An id a later table might drop, as movements keep it (ADR 0025).
    const retired = "retired_rule" as CategorizationRuleId;

    expect(
      savedMovementCategory(
        saved({ categoryRuleId: retired }),
        compileUserRules([]),
      ),
    ).toBeUndefined();
  });
});
