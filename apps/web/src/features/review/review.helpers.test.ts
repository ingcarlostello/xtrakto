import {
  amountMinorSchema,
  CATEGORIZATION_RULES,
  type CategoryId,
} from "@xtrakto/core";
import type { ReviewMovement } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";
import {
  answerPlan,
  answersToOffer,
  numberRules,
  numbersOf,
  pickQuarter,
  reviewGroupsOf,
  reviewHref,
  scopeText,
} from "./review.helpers";

const GUESSES = new Map(
  CATEGORIZATION_RULES.map(({ id, categoryId }) => [id, categoryId]),
);

// A movement waiting for review, with its rule's guess.
const movement = (
  id: string,
  [ruleId, descriptionRaw, amount]: [ReviewMovement["ruleId"], string, number],
): ReviewMovement => ({
  id,
  ruleId,
  descriptionRaw,
  descriptionNormalized: descriptionRaw.replace(/\s+/g, " "),
  amountMinor: amountMinorSchema.parse(amount),
  isPendingReview: true,
  categoryId: GUESSES.get(ruleId) ?? "other_spending",
  isUsersCategory: false,
  referenceHash: null,
  referenceLast4: null,
});

// The same movement once the user answered it with a category.
const answered = (
  categoryId: CategoryId,
  waiting: ReviewMovement,
): ReviewMovement => ({
  ...waiting,
  isPendingReview: false,
  categoryId,
  isUsersCategory: true,
});

// The same movement after "No sé": out of the review, the guess kept.
const dismissed = (waiting: ReviewMovement): ReviewMovement => ({
  ...waiting,
  isPendingReview: false,
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
  it("asks by group in the review's order, each text with its count, the amount at stake, how many and what they count as meanwhile", () => {
    expect(reviewGroupsOf(QUARTER)).toEqual([
      {
        id: "key_platforms",
        pending: {
          texts: [
            { text: "PAGO LLAVE INVERSIONES XY", count: 2 },
            { text: "PAGO LLAVE AHORRO DOLAR", count: 1 },
          ],
          amountMinor: -600_000_000,
          count: 3,
          kinds: [{ kind: "internal", amountMinor: -600_000_000, count: 3 }],
        },
        answered: null,
      },
      {
        id: "key_people",
        pending: {
          texts: [{ text: "PAGO LLAVE Maria Lopez", count: 1 }],
          amountMinor: -5_000_000,
          count: 1,
          kinds: [{ kind: "spending", amountMinor: -5_000_000, count: 1 }],
        },
        answered: null,
      },
      {
        id: "money_in",
        pending: {
          texts: [{ text: "TRANSFERENCIA DESDE NEQUI", count: 1 }],
          amountMinor: 120_000_000,
          count: 1,
          kinds: [{ kind: "internal", amountMinor: 120_000_000, count: 1 }],
        },
        answered: null,
      },
      {
        id: "no_description_out",
        pending: {
          texts: [{ text: "0", count: 2 }],
          amountMinor: -3_200_000,
          count: 2,
          kinds: [{ kind: "spending", amountMinor: -3_200_000, count: 2 }],
        },
        answered: null,
      },
    ]);
  });

  it("counts what waits by the kind it counts as meanwhile, the most first", () => {
    const [m1, , m3, m4] = QUARTER;
    if (!m1 || !m3 || !m4) throw new Error("No movements.");
    // A guess an earlier table of rules gave, which counts as spending.
    const earlier: ReviewMovement = { ...m3, categoryId: "other_spending" };

    const [group] = reviewGroupsOf([m1, earlier, m4]);

    expect(group?.pending?.kinds).toEqual([
      { kind: "internal", amountMinor: -500_000_000, count: 2 },
      { kind: "spending", amountMinor: -100_000_000, count: 1 },
    ]);
  });

  it("keeps an answered group, closed, with what its movements count as now", () => {
    const [m1, , m3, m4] = QUARTER;
    if (!m1 || !m3 || !m4) throw new Error("No movements.");

    const groups = reviewGroupsOf(
      [m1, m3, m4].map((m) => answered("investment", m)),
    );

    expect(groups).toEqual([
      {
        id: "key_platforms",
        pending: null,
        answered: {
          texts: [
            { text: "PAGO LLAVE INVERSIONES XY", count: 2 },
            { text: "PAGO LLAVE AHORRO DOLAR", count: 1 },
          ],
          amountMinor: -600_000_000,
          count: 3,
          outcomes: [
            {
              said: "Tu inversión o ahorro",
              categoryId: "investment",
              isGuessKept: false,
              count: 3,
            },
          ],
        },
      },
    ]);
  });

  it('says "No sé" for a guess kept, and a category given elsewhere by its label', () => {
    const [, m2, , , m5] = QUARTER;
    if (!m2 || !m5) throw new Error("No movements.");

    const groups = reviewGroupsOf([dismissed(m5), answered("groceries", m2)]);

    expect(groups.map(({ answered }) => answered?.outcomes)).toEqual([
      [
        {
          said: "No sé",
          categoryId: "transfers_to_people",
          isGuessKept: true,
          count: 1,
        },
      ],
      [
        {
          said: "Mercado",
          categoryId: "groceries",
          isGuessKept: false,
          count: 1,
        },
      ],
    ]);
  });

  it("asks about what waits in a group partly answered, keeping what was answered", () => {
    const [, , , , , m6, m7] = QUARTER;
    if (!m6 || !m7) throw new Error("No movements.");

    const [group] = reviewGroupsOf([answered("own_account_transfer", m6), m7]);

    expect(group).toMatchObject({
      id: "no_description_out",
      pending: { texts: [{ text: "0", count: 1 }], count: 1 },
      answered: {
        count: 1,
        outcomes: [{ said: "Plata que solo moviste", count: 1 }],
      },
    });
  });

  it("counts what each answer made of a group, the most first", () => {
    const transfers = [
      "TRANSF A ANA LUCIA MAR",
      "TRANSF A ANA LUCIA MAR",
      "TRANSF A ANA LUC",
    ].map((text, index) =>
      movement(`t${index}`, ["own_name_out_cut", text, -1_000]),
    );
    const [first, second, third] = transfers;
    if (!first || !second || !third) throw new Error("No movements.");

    const [group] = reviewGroupsOf([
      answered("transfers_to_people", first),
      answered("own_account_transfer", second),
      answered("own_account_transfer", third),
    ]);

    expect(
      group?.answered?.outcomes.map(({ said, count }) => [said, count]),
    ).toEqual([
      ["Son tuyas", 2],
      ["Son de otra persona", 1],
    ]);
  });

  it("asks nothing without movements", () => {
    expect(reviewGroupsOf([])).toEqual([]);
  });
});

// A Nequi send to a number, by its last 4 digits, waiting for review.
const sent = (id: string, last4: string, amount: number): ReviewMovement => ({
  ...movement(id, ["nequi_out_number", "TRANSFERENCIAS A NEQUI", amount]),
  referenceHash: last4.repeat(16),
  referenceLast4: last4,
});

describe("numbersOf", () => {
  it("asks about each number the sends went to, the most sent first", () => {
    expect(
      numbersOf([
        sent("n1", "5531", -50_000),
        sent("n2", "1270", -100_000),
        sent("n3", "1270", -200_000),
      ]),
    ).toEqual([
      {
        referenceHash: "1270".repeat(16),
        last4: "1270",
        text: "TRANSFERENCIAS A NEQUI",
        count: 2,
        amountMinor: -300_000,
        isMine: false,
      },
      {
        referenceHash: "5531".repeat(16),
        last4: "5531",
        text: "TRANSFERENCIAS A NEQUI",
        count: 1,
        amountMinor: -50_000,
        isMine: false,
      },
    ]);
  });

  it("knows a number is the user's once their rule says so, and only then", () => {
    const numbers = numbersOf([
      answered("own_account_transfer", sent("n1", "1270", -1_000)),
      answered("transfers_to_people", sent("n2", "5531", -1_000)),
      dismissed(sent("n3", "9082", -1_000)),
    ]);

    expect(numbers.map(({ last4, isMine }) => [last4, isMine])).toEqual([
      ["1270", true],
      ["5531", false],
      ["9082", false],
    ]);
  });

  it("gives the numbers only to the group that asks by number", () => {
    const groups = reviewGroupsOf([
      sent("n1", "1270", -1_000),
      ...QUARTER.slice(4, 5),
    ]);
    const pendingOf = (id: string) =>
      groups.find((group) => group.id === id)?.pending;

    expect(pendingOf("nequi_numbers")?.numbers).toHaveLength(1);
    expect(pendingOf("key_people")).not.toHaveProperty("numbers");
  });
});

describe("numberRules", () => {
  const numbers = numbersOf([
    sent("n1", "1270", -1_000),
    sent("n2", "5531", -1_000),
    answered("own_account_transfer", sent("n3", "9082", -1_000)),
  ]);

  it("saves each number's rule: the user's own for those marked, someone else's for the rest", () => {
    expect(numberRules(numbers, new Set(["1270".repeat(16)]))).toEqual([
      {
        target: "reference",
        referenceHash: "1270".repeat(16),
        referenceLast4: "1270",
        categoryId: "own_account_transfer",
      },
      {
        target: "reference",
        referenceHash: "5531".repeat(16),
        referenceLast4: "5531",
        categoryId: "transfers_to_people",
      },
    ]);
  });

  it("keeps a number already the user's, which only 6.3f takes back", () => {
    const rules = numberRules(numbers, new Set());

    expect(
      rules.flatMap((rule) =>
        rule.target === "reference" ? [rule.referenceHash] : [],
      ),
    ).not.toContain("9082".repeat(16));
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
      }),
    ).toBe("Jul – sep 2026 · Cuenta de ahorros ••••8901");
  });
});

describe("answersToOffer", () => {
  it("offers every answer while a group waits, the guess first", () => {
    expect(answersToOffer("key_platforms", { isChange: false })).toEqual([
      "investment",
      "person",
      "purchase",
      "unsure",
    ]);
  });

  it('offers all but "No sé" when "Cambiar" asks again: an answer changes, not undoes', () => {
    expect(answersToOffer("key_platforms", { isChange: true })).toEqual([
      "investment",
      "person",
      "purchase",
    ]);
  });
});

describe("reviewHref", () => {
  it("links to the review of the account's quarter", () => {
    expect(
      reviewHref({
        account: {
          id: "a1",
          bankId: "bancolombia",
          accountType: "savings",
          last4: "8901",
        },
        period: { kind: "quarter", year: 2026, quarter: 3 },
      }),
    ).toEqual({
      pathname: "/review",
      query: { account: "a1", period: "2026-q3" },
    });
  });
});
