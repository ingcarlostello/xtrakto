import { categoryKind, MONEY_DIRECTION } from "@xtrakto/core";
import { CATEGORIZATION_CASES } from "@xtrakto/evals";
import { describe, expect, it } from "vitest";
import { LLM_CATEGORY_CHOICES } from "./llm-categories.constants";
import {
  answersOf,
  batchesOf,
  cachedAnswersOf,
  categorizeInput,
  movementCategoriesOf,
  textGroupsOf,
  uncachedGroups,
} from "./llm-categories.helpers";

const { IN, OUT } = MONEY_DIRECTION;
const FLASH = "deepseek-flash";

describe("LLM_CATEGORY_CHOICES", () => {
  it("offers real spending for money out and income for money in, never moved", () => {
    expect(LLM_CATEGORY_CHOICES.out.map(categoryKind)).toEqual(
      LLM_CATEGORY_CHOICES.out.map(() => "spending"),
    );
    expect(LLM_CATEGORY_CHOICES.in.map(categoryKind)).toEqual(
      LLM_CATEGORY_CHOICES.in.map(() => "income"),
    );
  });

  it("holds every category the eval's set expects, for its direction", () => {
    const unreachable = CATEGORIZATION_CASES.filter(
      ({ direction, expected }) =>
        expected !== null &&
        !LLM_CATEGORY_CHOICES[direction].some((choice) => choice === expected),
    );

    expect(unreachable).toEqual([]);
  });
});

describe("batchesOf", () => {
  it("slices items in order, each batch with where it starts", () => {
    expect(batchesOf(["a", "b", "c", "d", "e"], 2)).toEqual([
      { start: 0, items: ["a", "b"] },
      { start: 2, items: ["c", "d"] },
      { start: 4, items: ["e"] },
    ]);
  });

  it("gives no batch for no items", () => {
    expect(batchesOf([], 25)).toEqual([]);
  });
});

describe("categorizeInput", () => {
  it("numbers each text from 1, with its money's direction", () => {
    expect(
      categorizeInput([
        { text: "COMPRA EN AUDIFARMA", direction: OUT },
        { text: "ABONO DEVOLUCION COMPRA", direction: IN },
      ]),
    ).toBe("1. out | COMPRA EN AUDIFARMA\n2. in | ABONO DEVOLUCION COMPRA");
  });

  it("redacts what a caller missed, such as a phone or an account number", () => {
    expect(
      categorizeInput([
        { text: "PAGO QR 3001234567", direction: OUT },
        { text: "PAGO PSE CONTRATO 12345678", direction: OUT },
      ]),
    ).toBe("1. out | PAGO QR [PHONE]\n2. out | PAGO PSE CONTRATO [NUMBER]");
  });

  it("keeps each text on its line, so the numbering holds", () => {
    expect(
      categorizeInput([{ text: " COMPRA EN\nTIENDA  UNO ", direction: OUT }]),
    ).toBe("1. out | COMPRA EN TIENDA UNO");
  });
});

describe("answersOf", () => {
  const texts = [
    { text: "COMPRA EN AUDIFARMA", direction: OUT },
    { text: "ABONO DEVOLUCION COMPRA", direction: IN },
  ];

  it("gives each line's answer to its text, with the model that gave it", () => {
    const answers = answersOf(
      texts,
      {
        answers: [
          { line: 2, category: "refund", confidence: 0.92 },
          { line: 1, category: "health", confidence: 0.8 },
        ],
      },
      FLASH,
    );

    expect(answers).toEqual(
      new Map([
        [0, { categoryId: "health", confidence: 0.8, model: FLASH }],
        [1, { categoryId: "refund", confidence: 0.92, model: FLASH }],
      ]),
    );
  });

  it("drops a category the money's direction doesn't allow", () => {
    const answers = answersOf(
      texts,
      {
        answers: [
          { line: 1, category: "refund", confidence: 0.9 },
          { line: 2, category: "shopping", confidence: 0.9 },
        ],
      },
      FLASH,
    );

    expect(answers.size).toBe(0);
  });

  it("drops a line the batch doesn't have, and a second answer for a line", () => {
    const answers = answersOf(
      texts,
      {
        answers: [
          { line: 3, category: "health", confidence: 0.9 },
          { line: 1, category: "health", confidence: 0.6 },
          { line: 1, category: "shopping", confidence: 0.95 },
        ],
      },
      FLASH,
    );

    expect(answers).toEqual(
      new Map([[0, { categoryId: "health", confidence: 0.6, model: FLASH }]]),
    );
  });
});

// The fixtures' holder, as a quarterly statement prints the name.
const HOLDER = "ANA MARIA PRUEBA GOMEZ";

describe("textGroupsOf", () => {
  it("redacts each text with the holder's names, once for the bank's texts it stands for", () => {
    expect(
      textGroupsOf(
        [
          { descriptionNormalized: "PAGO QR 3001234567", direction: OUT },
          { descriptionNormalized: "PAGO QR 3109876543", direction: OUT },
          { descriptionNormalized: "PAGO QR ANA MARIA PRUEBA", direction: OUT },
          { descriptionNormalized: "COMPRA EN AUDIFARMA", direction: OUT },
        ],
        [HOLDER],
      ),
    ).toEqual([
      {
        redactedText: "PAGO QR [PHONE]",
        direction: OUT,
        descriptions: ["PAGO QR 3001234567", "PAGO QR 3109876543"],
      },
      {
        redactedText: "PAGO QR [NAME]",
        direction: OUT,
        descriptions: ["PAGO QR ANA MARIA PRUEBA"],
      },
      {
        redactedText: "COMPRA EN AUDIFARMA",
        direction: OUT,
        descriptions: ["COMPRA EN AUDIFARMA"],
      },
    ]);
  });

  it("keeps the same text going each way apart", () => {
    const groups = textGroupsOf(
      [
        { descriptionNormalized: "COMPRA EN AUDIFARMA", direction: OUT },
        { descriptionNormalized: "COMPRA EN AUDIFARMA", direction: IN },
      ],
      [],
    );

    expect(groups.map(({ direction }) => direction)).toEqual([OUT, IN]);
  });
});

const DRUGSTORE = {
  redactedText: "COMPRA EN AUDIFARMA",
  direction: OUT,
  descriptions: ["COMPRA EN AUDIFARMA"],
};
const NEQUI = {
  redactedText: "PAGO QR [PHONE]",
  direction: OUT,
  descriptions: ["PAGO QR 3001234567", "PAGO QR 3109876543"],
};

describe("uncachedGroups", () => {
  it("leaves out the texts the cache answered, going their way", () => {
    expect(
      uncachedGroups(
        [DRUGSTORE, NEQUI],
        [{ redactedText: "COMPRA EN AUDIFARMA", direction: OUT }],
      ),
    ).toEqual([NEQUI]);
    expect(
      uncachedGroups(
        [DRUGSTORE],
        [{ redactedText: "COMPRA EN AUDIFARMA", direction: IN }],
      ),
    ).toEqual([DRUGSTORE]);
  });
});

describe("cachedAnswersOf", () => {
  it("keeps each answered text of the batch, under the threshold too", () => {
    const answers = new Map([
      [1, { categoryId: "transfers_to_people", confidence: 0.4, model: FLASH }],
    ] as const);

    expect(cachedAnswersOf([DRUGSTORE, NEQUI], answers)).toEqual([
      {
        redactedText: "PAGO QR [PHONE]",
        direction: OUT,
        categoryId: "transfers_to_people",
        confidence: 0.4,
        model: FLASH,
      },
    ]);
  });
});

describe("movementCategoriesOf", () => {
  const answer = (confidence: number) => ({
    redactedText: "PAGO QR [PHONE]",
    direction: OUT,
    categoryId: "transfers_to_people" as const,
    confidence,
    model: FLASH,
  });

  it("gives a confident answer to every bank text its redacted text stands for", () => {
    expect(movementCategoriesOf([DRUGSTORE, NEQUI], [answer(0.7)])).toEqual([
      {
        descriptionNormalized: "PAGO QR 3001234567",
        direction: OUT,
        categoryId: "transfers_to_people",
      },
      {
        descriptionNormalized: "PAGO QR 3109876543",
        direction: OUT,
        categoryId: "transfers_to_people",
      },
    ]);
  });

  it("gives nothing for an answer under the confidence threshold", () => {
    expect(movementCategoriesOf([NEQUI], [answer(0.69)])).toEqual([]);
  });
});
