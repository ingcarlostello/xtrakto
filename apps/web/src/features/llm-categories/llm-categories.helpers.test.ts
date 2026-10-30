import { categoryKind, MONEY_DIRECTION } from "@xtrakto/core";
import { CATEGORIZATION_CASES } from "@xtrakto/evals";
import { describe, expect, it } from "vitest";
import { LLM_CATEGORY_CHOICES } from "./llm-categories.constants";
import {
  answersOf,
  batchesOf,
  categorizeInput,
} from "./llm-categories.helpers";

const { IN, OUT } = MONEY_DIRECTION;

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

  it("gives each line's answer to its text", () => {
    const answers = answersOf(texts, {
      answers: [
        { line: 2, category: "refund", confidence: 0.92 },
        { line: 1, category: "health", confidence: 0.8 },
      ],
    });

    expect(answers).toEqual(
      new Map([
        [0, { categoryId: "health", confidence: 0.8 }],
        [1, { categoryId: "refund", confidence: 0.92 }],
      ]),
    );
  });

  it("drops a category the money's direction doesn't allow", () => {
    const answers = answersOf(texts, {
      answers: [
        { line: 1, category: "refund", confidence: 0.9 },
        { line: 2, category: "shopping", confidence: 0.9 },
      ],
    });

    expect(answers.size).toBe(0);
  });

  it("drops a line the batch doesn't have, and a second answer for a line", () => {
    const answers = answersOf(texts, {
      answers: [
        { line: 3, category: "health", confidence: 0.9 },
        { line: 1, category: "health", confidence: 0.6 },
        { line: 1, category: "shopping", confidence: 0.95 },
      ],
    });

    expect(answers).toEqual(
      new Map([[0, { categoryId: "health", confidence: 0.6 }]]),
    );
  });
});
