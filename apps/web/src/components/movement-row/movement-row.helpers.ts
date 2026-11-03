import { movementTitle, NO_DESCRIPTION } from "@xtrakto/core";
import type { TransactionListItem } from "@xtrakto/db";
import type { DescriptionView } from "./movement-row.types";

/**
 * How a movement is titled: in plain words over the bank's text as printed
 * (8.6a), by the bank's text when nothing says what it was, or, for its
 * `0`, that it gave none.
 */
export const descriptionView = ({
  descriptionRaw,
  categoryId,
  categoryRuleId,
  llmTitle,
}: Pick<
  TransactionListItem,
  "descriptionRaw" | "categoryId" | "categoryRuleId" | "llmTitle"
>): DescriptionView => {
  if (descriptionRaw.trim() === NO_DESCRIPTION)
    return { kind: "none", raw: descriptionRaw };
  const title = movementTitle({
    description: descriptionRaw,
    categoryId,
    categoryRuleId,
    llmTitle,
  });
  return title === undefined
    ? { kind: "bank", text: descriptionRaw }
    : { kind: "titled", title, raw: descriptionRaw };
};
