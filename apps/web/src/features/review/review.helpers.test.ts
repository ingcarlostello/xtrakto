import { amountMinorSchema } from "@xtrakto/core";
import type { ReviewMovement } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";
import {
  answerPlan,
  pickQuarter,
  reviewGroupsOf,
  scopeText,
} from "./review.helpers";

const movement = (
  id: string,
  [ruleId, descriptionRaw, amount]: [ReviewMovement["ruleId"], string, number],
): ReviewMovement => ({
  id,
  ruleId,
  descriptionRaw,
  descriptionNormalized: descriptionRaw.replace(/\s+/g, " "),
  amountMinor: amountMinorSchema.parse(amount),
});

// A quarter to review: key payments to a platform, money back from Nequi,
// a key payment to a person, and two movements the bank wrote as 0.
const QUARTER = [
  movement("m1", [
    "key_payment_saving",
    "PAGO LLAVE INVERSIONES XY",
    -300_000_000,
  ]),
  movement("m2", ["nequi_in", "TRANSFERENCIA DESDE NEQUI", 120_000_000]),
  movement("m3", [
    "key_payment_saving",
    "PAGO LLAVE AHORRO DOLAR",
    -100_000_000,
  ]),
  movement("m4", [
    "key_payment_saving",
    "PAGO LLAVE INVERSIONES XY",
    -200_000_000,
  ]),
  movement("m5", ["key_payment", "PAGO LLAVE Maria Lopez", -5_000_000]),
  movement("m6", ["no_description_out", "0", -2_200_000]),
  movement("m7", ["no_description_out", "0", -1_000_000]),
];

describe("reviewGroupsOf", () => {
  it("asks by group in the review's order, each text with its count, the amount at stake and how many", () => {
    expect(reviewGroupsOf(QUARTER)).toEqual([
      {
        id: "key_platforms",
        texts: [
          { text: "PAGO LLAVE INVERSIONES XY", count: 2 },
          { text: "PAGO LLAVE AHORRO DOLAR", count: 1 },
        ],
        amountMinor: -600_000_000,
        count: 3,
      },
      {
        id: "key_people",
        texts: [{ text: "PAGO LLAVE Maria Lopez", count: 1 }],
        amountMinor: -5_000_000,
        count: 1,
      },
      {
        id: "money_in",
        texts: [{ text: "TRANSFERENCIA DESDE NEQUI", count: 1 }],
        amountMinor: 120_000_000,
        count: 1,
      },
      {
        id: "no_description_out",
        texts: [{ text: "0", count: 2 }],
        amountMinor: -3_200_000,
        count: 2,
      },
    ]);
  });

  it("asks nothing without movements", () => {
    expect(reviewGroupsOf([])).toEqual([]);
  });
});

describe("answerPlan", () => {
  it("saves one rule per text and direction, however the bank wrote it", () => {
    const plan = answerPlan(
      [
        ...QUARTER.slice(0, 1),
        ...QUARTER.slice(2, 4),
        movement("m8", [
          "key_payment_saving",
          "Pago llave  inversiones xy",
          -1,
        ]),
      ],
      "transfers_to_people",
    );

    expect(plan).toEqual({
      rules: [
        {
          target: "description",
          descriptionFolded: "PAGO LLAVE INVERSIONES XY",
          direction: "out",
          categoryId: "transfers_to_people",
        },
        {
          target: "description",
          descriptionFolded: "PAGO LLAVE AHORRO DOLAR",
          direction: "out",
          categoryId: "transfers_to_people",
        },
      ],
      movementIds: [],
    });
  });

  it("gives the movements the bank wrote as 0 their category one by one", () => {
    expect(answerPlan(QUARTER.slice(5), "own_account_transfer")).toEqual({
      rules: [],
      movementIds: ["m6", "m7"],
    });
  });
});

describe("pickQuarter", () => {
  const QUARTERS = [
    { year: 2026, quarter: 3, verified: true },
    { year: 2026, quarter: 2, verified: false },
  ];
  const second: MovementPeriod = { kind: "quarter", year: 2026, quarter: 2 };
  const latest: MovementPeriod = { kind: "quarter", year: 2026, quarter: 3 };

  it.each<[string, MovementPeriod | undefined, MovementPeriod | undefined]>([
    ["the quarter the URL asks", second, second],
    [
      "the quarter of the month it asks",
      { kind: "month", year: 2026, month: 5 },
      second,
    ],
    [
      "the latest, for a quarter the account doesn't have",
      { kind: "quarter", year: 2025, quarter: 4 },
      latest,
    ],
    ["the latest, when the URL asks none", undefined, latest],
  ])("picks %s", (_, requested, expected) => {
    expect(pickQuarter(requested, QUARTERS)).toEqual(expected);
  });

  it("picks none for an account without movements", () => {
    expect(pickQuarter(undefined, [])).toBeUndefined();
  });
});

describe("scopeText", () => {
  it("names the quarter and the account, its digits in sight", () => {
    expect(
      scopeText({
        account: {
          id: "a1",
          bankId: "bancolombia",
          accountType: "savings",
          last4: "8901",
        },
        period: { kind: "quarter", year: 2026, quarter: 3 },
        groups: [],
      }),
    ).toBe("Jul – sep 2026 · Cuenta de ahorros ••••8901");
  });
});
