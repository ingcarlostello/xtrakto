import { describe, expect, expectTypeOf, it } from "vitest";
import categoriesJson from "../../categories.json";
import { CATEGORIES, CATEGORY_KINDS } from "./categories.constants";
import type { CategoryId, CategoryKind } from "./category.types";

const SNAKE_CASE_PATTERN = /^[a-z]+(_[a-z]+)*$/;
const { kinds, categories } = categoriesJson;

describe("categories.json", () => {
  it("declares each kind once", () => {
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it("gives every category a unique id", () => {
    const ids = categories.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses snake_case ids", () => {
    const invalidIds = categories
      .map(({ id }) => id)
      .filter((id) => !SNAKE_CASE_PATTERN.test(id));

    expect(invalidIds).toEqual([]);
  });

  it("gives every category one of the declared kinds", () => {
    const invalidKinds = categories
      .map(({ kind }) => kind)
      .filter((kind) => !kinds.includes(kind));

    expect(invalidKinds).toEqual([]);
  });

  it("gives every category a Spanish label", () => {
    const unlabeled = categories.filter(({ labelEs }) => labelEs.trim() === "");

    expect(unlabeled).toEqual([]);
  });

  it("has at least one category of each kind", () => {
    const usedKinds = new Set(categories.map(({ kind }) => kind));

    expect([...usedKinds].sort()).toEqual([...kinds].sort());
  });
});

describe("categories.constants.ts", () => {
  it("matches categories.json (if not, run `pnpm --filter @xtrakto/core generate:categories`)", () => {
    expect(CATEGORY_KINDS).toEqual(kinds);
    expect(CATEGORIES).toEqual(categories);
  });

  it("gives TypeScript literal types instead of plain strings", () => {
    expectTypeOf<"groceries">().toExtend<CategoryId>();
    expectTypeOf<"not_a_category">().not.toExtend<CategoryId>();
    expectTypeOf<CategoryKind>().toEqualTypeOf<
      "spending" | "income" | "internal"
    >();
  });
});
