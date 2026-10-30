import {
  amountMinorSchema,
  type CategoryId,
  localDateSchema,
  periodSchema,
} from "@xtrakto/core";
import type { MovementDetail } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import {
  categoryChoices,
  correctionView,
  fitsMovement,
  isCategoryId,
  kindChoices,
  savedText,
} from "./correction.helpers";

const amount = (value: number) => amountMinorSchema.parse(value);

// A key payment out, a guess the user can correct.
const movement = (changes: Partial<MovementDetail> = {}): MovementDetail => ({
  id: "m1",
  date: localDateSchema.parse("2026-08-12"),
  descriptionRaw: "PAGO LLAVE Maria Lopez",
  descriptionNormalized: "PAGO LLAVE Maria Lopez",
  amountMinor: amount(-6_000_000),
  balanceAfterMinor: null,
  categoryId: "transfers_to_people",
  isPendingReview: true,
  referenceHash: null,
  referenceKind: "none",
  referenceLast4: null,
  categorySource: "rule",
  categoryRuleId: "key_payment",
  llmTitle: null,
  statement: {
    formatId: "bancolombia-movements-export",
    period: periodSchema.parse({ from: "2026-08-01", to: "2026-08-31" }),
  },
  ...changes,
});

const NO_RULES = { number: null, text: null };

describe("kindChoices", () => {
  it.each([
    [-1_000, ["spending", "internal"]],
    [1_000, ["income", "internal"]],
    [0, ["spending", "internal"]],
  ])("offers money of %i the kinds its direction allows", (value, kinds) => {
    expect(kindChoices(amount(value))).toEqual(kinds);
  });
});

describe("categoryChoices", () => {
  it("lists a kind's categories in the table's order", () => {
    expect(categoryChoices("internal")).toEqual([
      { id: "own_account_transfer", label: "Entre tus cuentas" },
      { id: "credit_card_payment", label: "Pago de tarjeta de crédito" },
      { id: "investment", label: "Inversiones" },
    ]);
  });
});

describe("fitsMovement", () => {
  it.each<[number, CategoryId, boolean]>([
    [-1_000, "groceries", true],
    [-1_000, "investment", true],
    [-1_000, "income_transfer", false],
    [1_000, "refund", true],
    [1_000, "own_account_transfer", true],
    [1_000, "groceries", false],
  ])("for money of %i, %s fits: %s", (value, categoryId, fits) => {
    expect(fitsMovement(amount(value), categoryId)).toBe(fits);
  });

  it("knows only the table's categories", () => {
    expect(isCategoryId("investment")).toBe(true);
    expect(isCategoryId("digital_wallet")).toBe(false);
  });
});

describe("correctionView", () => {
  it("starts on the kind and category the movement has, with how many like it", () => {
    expect(
      correctionView(
        { movement: movement(), similar: 3, rules: NO_RULES },
        "a1",
      ),
    ).toEqual({
      accountId: "a1",
      movementId: "m1",
      kinds: ["spending", "internal"],
      kind: "spending",
      categoryId: "transfers_to_people",
      applyLabel: "Aplicar a los 3 parecidos",
    });
  });

  it.each([
    [1, "Aplicar al parecido"],
    [0, "Aplicar también a los próximos"],
    [null, null],
  ])("offers to apply it to %s like it as %s", (similar, label) => {
    expect(
      correctionView({ movement: movement(), similar, rules: NO_RULES }, "a1")
        .applyLabel,
    ).toBe(label);
  });

  it("starts on Movido for money that only moved", () => {
    const moved = movement({ categoryId: "investment" });

    expect(
      correctionView({ movement: moved, similar: 0, rules: NO_RULES }, "a1"),
    ).toMatchObject({ kind: "internal", categoryId: "investment" });
  });

  it("starts money in without a category on income, choosing none yet", () => {
    const unknown = movement({
      amountMinor: amount(100_000),
      categoryId: null,
      categorySource: null,
      categoryRuleId: null,
      isPendingReview: false,
    });

    expect(
      correctionView({ movement: unknown, similar: 0, rules: NO_RULES }, "a1"),
    ).toMatchObject({
      kinds: ["income", "internal"],
      kind: "income",
      categoryId: null,
    });
  });

  it("chooses none of a category that doesn't fit the money's direction", () => {
    const misfit = movement({ amountMinor: amount(100_000) });

    expect(
      correctionView({ movement: misfit, similar: 0, rules: NO_RULES }, "a1"),
    ).toMatchObject({ kind: "income", categoryId: null });
  });
});

describe("savedText", () => {
  it.each<[Parameters<typeof savedText>[0], string]>([
    [
      { scope: "movement", category: "own_account_transfer" },
      "Listo: este movimiento cuenta como movido.",
    ],
    [
      { scope: "similar", category: "groceries" },
      "Listo: los movimientos con este texto cuentan como gasto real, también los próximos.",
    ],
    [
      { scope: "movement", category: "refund" },
      "Listo: este movimiento cuenta como ingreso.",
    ],
  ])("says what was saved: %j", (result, text) => {
    expect(savedText(result)).toBe(text);
  });
});
