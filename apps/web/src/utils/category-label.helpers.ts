import { CATEGORIES, type CategoryId } from "@xtrakto/core";

/** A category's name: "Pagos a personas". */
export const categoryLabel = (categoryId: CategoryId): string =>
  CATEGORIES.find(({ id }) => id === categoryId)?.labelEs ?? categoryId;
