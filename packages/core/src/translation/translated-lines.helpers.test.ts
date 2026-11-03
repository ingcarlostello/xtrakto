import { describe, expect, it } from "vitest";
import type { CategoryId } from "../categories/category.types";
import type { CategorizationRuleId } from "../categorization/categorization.types";
import { findRecurringPayments } from "../recurring/recurring.helpers";
import { localDateSchema } from "../dates/date.schemas";
import { amountMinorSchema } from "../money/money.schemas";
import { isInLineFilter, translatedLines } from "./translated-lines.helpers";

// A movement of the period as the summary reads it, invented.
const movement = (
  date: string,
  amount: number,
  [descriptionRaw, categoryId, isPendingReview = false]: readonly [
    string,
    CategoryId | null,
    boolean?,
  ],
) => ({
  date: localDateSchema.parse(date),
  amountMinor: amountMinorSchema.parse(amount),
  descriptionRaw,
  categoryId,
  isPendingReview,
  referenceHash: null,
  referenceLast4: null,
  categoryRuleId: null as CategorizationRuleId | null,
});

const SALARY = ["PAGO INTERBANC EMPRESA EJEMPLO", "income_transfer"] as const;
const NEQUI = ["TRANSFERENCIAS A NEQUI", "transfers_to_people"] as const;
const NEQUI_MINE = ["TRANSFERENCIAS A NEQUI", "own_account_transfer"] as const;
const BACK = ["TRANSFERENCIA DESDE NEQUI", "own_account_transfer"] as const;
const CARD = ["PAGO SUC VIRT TC MASTER PESOS", "credit_card_payment"] as const;
const LOAN = ["PAGO PSE Financiera Andes S", "loan_payment"] as const;
const KEY = ["PAGO LLAVE INVERSIONES XY", "investment", true] as const;
const SHOP = ["COMPRA EN AUDIFARMA", "health"] as const;
const UNKNOWN = ["ABONO VARIOS", null] as const;

const NO_FIXED = { fixedPayments: [] };

const textsOf = (lines: readonly { movement: { descriptionRaw: string } }[]) =>
  lines.map(({ movement }) => movement.descriptionRaw);

describe("translatedLines", () => {
  it("shows one line per bank text, way and category, with its largest movement and what its text adds up to", () => {
    const lines = translatedLines(
      [
        movement("2026-07-05", 3_154_020_000, SALARY),
        movement("2026-07-30", 830_000_000, SALARY),
        movement("2026-07-02", -9_000_000, NEQUI),
        movement("2026-07-09", -12_000_000, NEQUI),
        movement("2026-07-20", -12_000_000, NEQUI),
        movement("2026-07-21", -3_000_000, NEQUI_MINE),
      ],
      NO_FIXED,
    );

    expect(lines).toEqual([
      {
        movement: expect.objectContaining({ date: "2026-07-05" }),
        note: {
          kind: "sum",
          others: 1,
          totalMinor: 3_984_020_000,
          otherDate: "2026-07-30",
        },
      },
      {
        // The earliest of the two largest sends.
        movement: expect.objectContaining({ date: "2026-07-09" }),
        note: { kind: "sum", others: 2, totalMinor: -33_000_000 },
      },
      {
        movement: expect.objectContaining({ date: "2026-07-21" }),
        note: {
          kind: "moved",
          categoryId: "own_account_transfer",
          direction: "out",
        },
      },
    ]);
  });

  it("tells a text's money in from its money out, and leaves a movement of $0 out", () => {
    const lines = translatedLines(
      [
        // A text the user made theirs both ways: moved out, and back.
        movement("2026-07-05", -50_000_00, [
          "TRANSFERENCIA CTA SUC VIRTUAL",
          "own_account_transfer",
        ]),
        movement("2026-07-06", 20_000_00, [
          "TRANSFERENCIA CTA SUC VIRTUAL",
          "own_account_transfer",
        ]),
        movement("2026-07-07", 0, SHOP),
      ],
      NO_FIXED,
    );

    expect(lines.map(({ movement: m }) => m.amountMinor)).toEqual([
      -50_000_00, 20_000_00,
    ]);
  });

  it("says first that a guess waits for review, then a fixed payment's days, then what moved money is", () => {
    // A loan paid between the 2nd and the 4th of three months in a row.
    const history = [
      movement("2026-07-02", -154_000_000, LOAN),
      movement("2026-08-04", -154_000_000, LOAN),
      movement("2026-09-03", -154_000_000, LOAN),
    ];
    const { spending } = findRecurringPayments(history);
    const lines = translatedLines(
      [
        ...history,
        movement("2026-07-10", -200_000_000, KEY),
        movement("2026-08-10", -200_000_000, KEY),
        movement("2026-07-15", -125_000_000, CARD),
        movement("2026-07-16", 120_000_000, BACK),
      ],
      { fixedPayments: spending },
    );

    expect(lines.map(({ note }) => note)).toEqual([
      { kind: "guess", categoryId: "investment" },
      { kind: "fixed", days: { first: 2, last: 4 } },
      { kind: "moved", categoryId: "credit_card_payment", direction: "out" },
      { kind: "moved", categoryId: "own_account_transfer", direction: "in" },
    ]);
  });

  it("calls no line fixed whose text a payment doesn't name, or names with another category", () => {
    const sends = [
      movement("2026-07-02", -90_000_00, NEQUI),
      movement("2026-08-02", -90_000_00, NEQUI),
      movement("2026-09-02", -90_000_00, NEQUI),
    ];
    // Paid to one number, which a line of every send can't stand for.
    const toOneNumber = findRecurringPayments(
      sends.map((m) => ({
        ...m,
        referenceHash: "hmac-1",
        referenceLast4: "1270",
      })),
    ).spending;
    const loan = findRecurringPayments([
      movement("2026-07-02", -154_000_000, LOAN),
      movement("2026-08-02", -154_000_000, LOAN),
      movement("2026-09-02", -154_000_000, LOAN),
    ]).spending;

    const [nequi] = translatedLines(sends, { fixedPayments: toOneNumber });
    const [asOther] = translatedLines(
      [movement("2026-09-02", -154_000_000, [LOAN[0], "other_spending"])],
      { fixedPayments: loan },
    );

    expect(nequi?.note.kind).toBe("sum");
    expect(asOther?.note).toEqual({ kind: "counts", categoryKind: "spending" });
  });

  it("says what a lone movement counts as, or that nothing says what it is", () => {
    const lines = translatedLines(
      [
        movement("2026-07-03", -45_000_00, SHOP),
        movement("2026-07-04", 18_000_00, UNKNOWN),
      ],
      NO_FIXED,
    );

    expect(lines.map(({ note }) => note)).toEqual([
      { kind: "counts", categoryKind: "spending" },
      { kind: "counts" },
    ]);
  });

  it("shows first, without a filter, the largest sure line of each kind and the largest guess, then fills to five by amount", () => {
    const movements = [
      movement("2026-07-05", 3_154_020_000, SALARY),
      movement("2026-07-06", 900_000_000, [
        "PAGO INTERBANC OTRA EMPRESA",
        "income_transfer",
      ]),
      movement("2026-07-07", 800_000_000, [
        "PAGO INTERBANC TERCERA",
        "income_transfer",
      ]),
      // A guess of money that moved out, larger than the sure one.
      movement("2026-07-12", -200_000_000, KEY),
      movement("2026-07-15", -125_000_000, CARD),
      movement("2026-07-11", 120_000_000, BACK),
      movement("2026-07-10", -45_000_00, SHOP),
    ];

    expect(textsOf(translatedLines(movements, NO_FIXED))).toEqual([
      SALARY[0],
      KEY[0],
      CARD[0],
      BACK[0],
      SHOP[0],
    ]);
  });

  it("fills to five by amount when a kind has no line", () => {
    const movements = [
      movement("2026-07-05", 3_154_020_000, SALARY),
      movement("2026-07-06", 900_000_000, [
        "PAGO INTERBANC OTRA EMPRESA",
        "income_transfer",
      ]),
      movement("2026-07-07", 800_000_000, [
        "PAGO INTERBANC TERCERA",
        "income_transfer",
      ]),
      movement("2026-07-08", 700_000_000, [
        "PAGO INTERBANC CUARTA",
        "income_transfer",
      ]),
      movement("2026-07-10", -45_000_00, SHOP),
      movement("2026-07-11", 600_000_000, [
        "PAGO INTERBANC QUINTA",
        "income_transfer",
      ]),
    ];

    expect(textsOf(translatedLines(movements, NO_FIXED))).toEqual([
      SALARY[0],
      "PAGO INTERBANC OTRA EMPRESA",
      "PAGO INTERBANC TERCERA",
      "PAGO INTERBANC CUARTA",
      SHOP[0],
    ]);
  });

  it("keeps a filter's five largest lines, a kind's guesses among them", () => {
    const movements = [
      movement("2026-07-08", -2_200_000_000, [
        "APERTURA INV VIRTUAL",
        "investment",
      ]),
      movement("2026-07-09", -200_000_000, KEY),
      movement("2026-07-10", -125_000_000, CARD),
      movement("2026-07-11", 120_000_000, BACK),
      movement("2026-07-12", -90_000_000, [
        "PAGO PSE FONDO EJEMPLO",
        "investment",
      ]),
      movement("2026-07-13", -30_000_000, NEQUI_MINE),
      movement("2026-07-14", 3_154_020_000, SALARY),
    ];

    expect(
      textsOf(translatedLines(movements, { ...NO_FIXED, filter: "moved" })),
    ).toEqual([
      "APERTURA INV VIRTUAL",
      KEY[0],
      CARD[0],
      BACK[0],
      "PAGO PSE FONDO EJEMPLO",
    ]);
    expect(
      textsOf(translatedLines(movements, { ...NO_FIXED, filter: "review" })),
    ).toEqual([KEY[0]]);
  });
});

describe("isInLineFilter", () => {
  it("keeps a kind's movements, its guesses too, or those to review; every one without a filter", () => {
    const guess = movement("2026-07-09", -200_000_000, KEY);
    const unknown = movement("2026-07-04", 18_000_00, UNKNOWN);

    expect(isInLineFilter(guess, "moved")).toBe(true);
    expect(isInLineFilter(guess, "review")).toBe(true);
    expect(isInLineFilter(guess, "spending")).toBe(false);
    expect(
      isInLineFilter(movement("2026-07-10", -45_000_00, SHOP), "review"),
    ).toBe(false);
    expect(isInLineFilter(unknown, "income")).toBe(false);
    expect(isInLineFilter(unknown)).toBe(true);
  });
});
