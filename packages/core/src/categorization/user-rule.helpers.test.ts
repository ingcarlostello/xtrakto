import { describe, expect, it } from "vitest";
import { amountMinorSchema } from "../money/money.schemas";
import type { UserCategoryRule } from "./categorization.types";
import {
  compileUserRules,
  descriptionRuleFor,
  userCategoryOf,
} from "./user-rule.helpers";

const MY_NEQUI = "a".repeat(64);
const SOMEONE_ELSES_NEQUI = "b".repeat(64);

const movement = (
  descriptionNormalized: string,
  amount: number,
  referenceHash?: string,
) => ({
  descriptionNormalized,
  amountMinor: amountMinorSchema.parse(amount),
  referenceHash,
});

// What a user answered: key payments to a platform are their investment,
// Nequi transfers are payments to people, and one Nequi number is theirs.
const RULES: readonly UserCategoryRule[] = [
  {
    target: "description",
    descriptionFolded: "PAGO LLAVE INVERSIONES XY",
    direction: "out",
    categoryId: "investment",
  },
  {
    target: "description",
    descriptionFolded: "TRANSFERENCIAS A NEQUI",
    direction: "out",
    categoryId: "transfers_to_people",
  },
  {
    target: "reference",
    referenceHash: MY_NEQUI,
    categoryId: "own_account_transfer",
  },
];

describe("userCategoryOf", () => {
  const rules = compileUserRules(RULES);
  const categoryOf = (...args: Parameters<typeof movement>) =>
    userCategoryOf(movement(...args), rules);

  it("gives a text rule's category to the same text going the same way, whatever its case, accents or spaces", () => {
    expect(categoryOf("PAGO LLAVE INVERSIONES XY", -200_000_000)).toBe(
      "investment",
    );
    expect(categoryOf("Pago  llave Inversiónes xy", -1)).toBe("investment");
    expect(categoryOf("PAGO LLAVE INVERSIONES XYZ", -1)).toBeUndefined();
    expect(categoryOf("PAGO LLAVE INVERSIONES XY", 1)).toBeUndefined();
  });

  it("gives a reference rule's category both ways, before the text's", () => {
    expect(categoryOf("TRANSFERENCIAS A NEQUI", -9_000_000, MY_NEQUI)).toBe(
      "own_account_transfer",
    );
    expect(categoryOf("TRANSFERENCIA DESDE NEQUI", 9_000_000, MY_NEQUI)).toBe(
      "own_account_transfer",
    );
    expect(
      categoryOf("TRANSFERENCIAS A NEQUI", -9_000_000, SOMEONE_ELSES_NEQUI),
    ).toBe("transfers_to_people");
  });

  it("gives nothing to a movement of 0, or to one no rule of the user's knows", () => {
    expect(categoryOf("PAGO LLAVE INVERSIONES XY", 0)).toBeUndefined();
    expect(categoryOf("COMPRA EN TIENDA", -1)).toBeUndefined();
    expect(
      userCategoryOf(
        movement("PAGO LLAVE INVERSIONES XY", -1),
        compileUserRules([]),
      ),
    ).toBeUndefined();
  });
});

describe("descriptionRuleFor", () => {
  it("makes a rule of the movement's text, folded, and its direction", () => {
    expect(
      descriptionRuleFor(
        movement("TRANSF A Ana Lucía  Mar", -1),
        "own_account_transfer",
      ),
    ).toEqual({
      target: "description",
      descriptionFolded: "TRANSF A ANA LUCIA MAR",
      direction: "out",
      categoryId: "own_account_transfer",
    });
    expect(
      descriptionRuleFor(
        movement("TRANSFERENCIA DESDE NEQUI", 1),
        "income_transfer",
      ),
    ).toMatchObject({ direction: "in" });
  });

  it("makes none of the bank's 0, which says nothing, or of a movement of 0", () => {
    expect(
      descriptionRuleFor(movement("0", -2_200_000), "other_spending"),
    ).toBeNull();
    expect(
      descriptionRuleFor(movement("COMPRA EN TIENDA", 0), "groceries"),
    ).toBeNull();
  });
});
