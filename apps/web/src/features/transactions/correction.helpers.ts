import {
  type AmountMinor,
  CATEGORIES,
  type CategoryId,
  type CategoryKind,
  categoryKind,
  MONEY_DIRECTION,
  moneyDirectionOf,
} from "@xtrakto/core";
import { formatCount } from "@/utils/count-text.utils";
import { CORRECTION_SCOPE, TRANSACTIONS_COPY } from "./transaction.constants";
import type {
  CorrectionResult,
  CorrectionView,
  OpenMovement,
} from "./transaction.types";

const COPY = TRANSACTIONS_COPY.detail;

type KindChoices = readonly [CategoryKind, ...CategoryKind[]];

/** Whether a value is one of the table's categories. */
export const isCategoryId = (value: unknown): value is CategoryId =>
  CATEGORIES.some(({ id }) => id === value);

/**
 * The kinds a movement can count as, by its money's direction: money in is
 * an income or came back from the user's own; anything else, spending or
 * money that moved.
 */
export const kindChoices = (amount: AmountMinor): KindChoices =>
  moneyDirectionOf(amount) === MONEY_DIRECTION.IN
    ? ["income", "internal"]
    : ["spending", "internal"];

/** The categories of a kind, in the table's order. */
export const categoryChoices = (kind: CategoryKind) =>
  CATEGORIES.filter((category) => category.kind === kind).map(
    ({ id, labelEs }) => ({ id, label: labelEs }),
  );

/** Whether a category fits the way a movement's money went. */
export const fitsMovement = (
  amount: AmountMinor,
  categoryId: CategoryId,
): boolean => {
  const kind = categoryKind(categoryId);
  return kind !== undefined && kindChoices(amount).includes(kind);
};

// "Aplicar a los 3 parecidos", to the one like it, or to the next ones.
const applyLabelOf = (similar: number | null): string | null => {
  if (similar === null) return null;
  if (similar === 0) return COPY.applyToNext;
  if (similar === 1) return COPY.applyToOne;
  return `${COPY.applyToMany.before} ${formatCount(similar)} ${COPY.applyToMany.after}`;
};

/**
 * A movement's kind and category as the detail's form offers them
 * (docs/ui/v8-03): those its money's direction allows, starting on what it
 * counts as now.
 */
export const correctionView = (
  { movement, similar }: OpenMovement,
  accountId: string,
): CorrectionView => {
  const kinds = kindChoices(movement.amountMinor);
  const current =
    movement.categoryId === null
      ? undefined
      : categoryKind(movement.categoryId);
  const fits = current !== undefined && kinds.includes(current);
  return {
    accountId,
    movementId: movement.id,
    kinds,
    kind: fits ? current : kinds[0],
    categoryId: fits ? movement.categoryId : null,
    applyLabel: applyLabelOf(similar),
  };
};

/** What a saved correction says: "Listo: este movimiento cuenta como movido." */
export const savedText = ({ scope, category }: CorrectionResult): string => {
  const kind = categoryKind(category);
  const word = kind === undefined ? "" : COPY.kindWords[kind];
  return scope === CORRECTION_SCOPE.SIMILAR
    ? `${COPY.savedSimilar} ${word}, ${COPY.andNext}.`
    : `${COPY.savedOne} ${word}.`;
};
