import { CATEGORIES } from "./categories.constants";
import type { CategoryId, CategoryKind } from "./category.types";

const KIND_OF: ReadonlyMap<CategoryId, CategoryKind> = new Map(
  CATEGORIES.map(({ id, kind }) => [id, kind]),
);

/**
 * What a movement of the category means for the headline numbers: real
 * spending, income, or money that only moved. A movement's kind is always
 * its category's, so it's never stored apart (ADR 0024). `undefined` for an
 * id the table no longer has.
 */
export const categoryKind = (
  categoryId: CategoryId,
): CategoryKind | undefined => KIND_OF.get(categoryId);

/** The categories of a kind, which a query for that kind lists. */
export const categoriesOfKind = (kind: CategoryKind): readonly CategoryId[] =>
  CATEGORIES.filter((category) => category.kind === kind).map(({ id }) => id);
