import { describe, expect, it } from "vitest";
import { prepareStatement } from "../statements/prepared-statement.helpers";
import { parsedStatementSchema } from "../statements/statement.schemas";
import { categorizeStatement } from "./categorize-statement.helpers";

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

  it("keeps everything else the statement had, in its order", async () => {
    const statement = await prepared();
    const categorized = categorizeStatement(statement);

    expect(categorized.contentHash).toBe(statement.contentHash);
    expect(categorized.transactions).toMatchObject(statement.transactions);
  });
});
