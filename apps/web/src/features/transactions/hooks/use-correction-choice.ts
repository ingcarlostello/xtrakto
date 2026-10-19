import type { CategoryKind } from "@xtrakto/core";
import { useState } from "react";
import { DEFAULT_CATEGORY_OF_KIND } from "../transaction.constants";
import type { CorrectionView } from "../transaction.types";

/**
 * The kind and category the detail's form shows: what the movement counts
 * as, until the user chooses. When the page brings it another category, as
 * when its number becomes the user's, the form shows that one again.
 */
export const useCorrectionChoice = ({
  kind: savedKind,
  categoryId: savedCategory,
}: Pick<CorrectionView, "kind" | "categoryId">) => {
  const [kind, setKind] = useState(savedKind);
  const [category, setCategory] = useState(savedCategory);
  const [shown, setShown] = useState(savedCategory);
  if (shown !== savedCategory) {
    setShown(savedCategory);
    setKind(savedKind);
    setCategory(savedCategory);
  }
  // A kind starts its categories on the one it says when nothing more is known.
  const chooseKind = (next: CategoryKind) => {
    setKind(next);
    setCategory(DEFAULT_CATEGORY_OF_KIND[next]);
  };
  return { kind, category, chooseKind, chooseCategory: setCategory };
};
