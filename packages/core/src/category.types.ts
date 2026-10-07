import type { CATEGORIES, CATEGORY_KINDS } from "./categories.constants";

/**
 * What a movement means for the headline numbers: real spending, income, or
 * money that only moved between the user's own accounts (`internal`).
 */
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export type Category = (typeof CATEGORIES)[number];

export type CategoryId = Category["id"];
