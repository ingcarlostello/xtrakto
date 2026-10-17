import { describe, expect, it } from "vitest";
import { categoriesOfKind, categoryKind } from "./category.helpers";
import type { CategoryId } from "./category.types";

describe("categoryKind", () => {
  it.each([
    ["groceries", "spending"],
    ["other_spending", "spending"],
    ["interest", "income"],
    ["own_account_transfer", "internal"],
    ["credit_card_payment", "internal"],
  ] as const)("gives %s its category's kind, %s", (categoryId, kind) => {
    expect(categoryKind(categoryId)).toBe(kind);
  });

  it("gives no kind to an id the table no longer has", () => {
    // As a row saved before a category left categories.json could hold.
    expect(categoryKind("digital_wallet" as CategoryId)).toBeUndefined();
  });
});

describe("categoriesOfKind", () => {
  it("lists every category of a kind, and only those", () => {
    expect(categoriesOfKind("internal")).toEqual([
      "own_account_transfer",
      "credit_card_payment",
      "investment",
    ]);
    expect(categoriesOfKind("income")).not.toContain("groceries");
  });
});
