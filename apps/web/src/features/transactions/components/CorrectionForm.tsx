"use client";

import type { CategoryId, CategoryKind } from "@xtrakto/core";
import { ChevronDown, CircleAlert } from "lucide-react";
import { type ReactNode, useActionState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { correctMovement } from "../actions/correct-movement.action";
import {
  CATEGORY_ICONS,
  UNKNOWN_CATEGORY_ICON,
} from "@/components/movement-icon/category-icons.constants";
import {
  categoryChoices,
  isCategoryId,
  savedText,
} from "../correction.helpers";
import { useCorrectionChoice } from "../hooks/use-correction-choice";
import { useSubmitWithoutReset } from "../hooks/use-submit-without-reset";
import { CORRECTION_SCOPE, TRANSACTIONS_COPY } from "../transaction.constants";
import type { CorrectionView } from "../transaction.types";
import { SaveStatus } from "./SaveStatus";

const COPY = TRANSACTIONS_COPY.detail;

// The kinds its money allows, as a segmented control of radios
// (design-system.md §9): the arrow keys move between them.
function KindChoice({
  kinds,
  kind,
  onChoose,
}: {
  kinds: readonly CategoryKind[];
  kind: CategoryKind;
  onChoose: (kind: CategoryKind) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="pb-2 text-body font-bold">{COPY.kind}</legend>
      <div className="flex gap-1 rounded-full bg-surface/80 p-[5px] shadow-chip">
        {kinds.map((option) => (
          <label
            key={option}
            className="flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-full px-4 text-sm font-semibold text-ink-muted has-checked:bg-primary-soft has-checked:font-bold has-checked:text-primary-strong has-focus-visible:outline-[3px] has-focus-visible:outline-offset-[3px] has-focus-visible:outline-primary has-focus-visible:outline-solid"
          >
            <input
              type="radio"
              name="kind"
              value={option}
              checked={kind === option}
              onChange={() => onChoose(option)}
              className="sr-only"
            />
            {COPY.kinds[option]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type CategoryChoiceProps = {
  kind: CategoryKind;
  value: CategoryId | null;
  onChoose: (category: CategoryId) => void;
  isGuess: boolean;
};

const CATEGORY_FIELD_ID = "correction-category";

// "Categoría", and "Por revisar" beside it while it's a guess.
function CategoryLabel({ isGuess }: { isGuess: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={CATEGORY_FIELD_ID} className="text-body font-bold">
        {COPY.category}
      </label>
      {isGuess && (
        <Badge variant="review">
          <CircleAlert aria-hidden />
          {TRANSACTIONS_COPY.tags.pendingReview}
        </Badge>
      )}
    </div>
  );
}

// The categories of the kind chosen, "Sin categoría" until one is.
function CategorySelect({
  kind,
  value,
  onChoose,
}: Omit<CategoryChoiceProps, "isGuess">) {
  return (
    <select
      id={CATEGORY_FIELD_ID}
      name="category"
      required
      value={value ?? ""}
      onChange={({ target }) => {
        if (isCategoryId(target.value)) onChoose(target.value);
      }}
      className="h-12 w-full appearance-none rounded-full bg-surface pr-11 pl-11 text-body text-ink shadow-chip"
    >
      {value === null && (
        <option value="" disabled>
          {COPY.noCategory}
        </option>
      )}
      {categoryChoices(kind).map(({ id, label }) => (
        <option key={id} value={id}>
          {label}
        </option>
      ))}
    </select>
  );
}

// The category as a white pill with the chosen one's icon and a chevron.
function CategoryChoice({ isGuess, ...select }: CategoryChoiceProps) {
  const Icon =
    (select.value && CATEGORY_ICONS[select.value]) ?? UNKNOWN_CATEGORY_ICON;
  return (
    <div className="flex flex-col gap-2">
      <CategoryLabel isGuess={isGuess} />
      <div className="relative">
        <Icon
          aria-hidden
          strokeWidth={1.7}
          className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2"
        />
        <CategorySelect {...select} />
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-4 size-[18px] -translate-y-1/2 text-ink-muted"
        />
      </div>
    </div>
  );
}

// "Guardar cambios", and "Aplicar a los 3 parecidos" when its text makes a
// rule. While the form sends, both keep their focus but wait.
function CorrectionButtons({
  applyLabel,
  isPending,
}: {
  applyLabel: string | null;
  isPending: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        type="submit"
        name="scope"
        value={CORRECTION_SCOPE.MOVEMENT}
        disabled={isPending}
        focusableWhenDisabled
      >
        {COPY.save}
      </Button>
      {applyLabel !== null && (
        <Button
          type="submit"
          variant="secondary"
          name="scope"
          value={CORRECTION_SCOPE.SIMILAR}
          disabled={isPending}
          focusableWhenDisabled
        >
          {applyLabel}
        </Button>
      )}
    </div>
  );
}

type CorrectionFormProps = {
  view: CorrectionView;
  isGuess: boolean;
  /** Why it has its category, between the choices and the buttons (v8-03). */
  children: ReactNode;
};

/**
 * A movement's kind and category as choices (docs/ui/v8-03): "Guardar
 * cambios" for that movement, and "Aplicar a los 3 parecidos" for every one
 * with its text, also the next ones. Choosing a kind starts its categories
 * on the one it says when nothing more is known.
 */
export function CorrectionForm({
  view,
  isGuess,
  children,
}: CorrectionFormProps) {
  const [state, dispatch, isPending] = useActionState(correctMovement, null);
  const onSubmit = useSubmitWithoutReset(dispatch);
  const { kind, category, chooseKind, chooseCategory } =
    useCorrectionChoice(view);
  // Each saved correction tells PostHog whether it was for this movement or
  // for every one with its text, never which category (ADR 0029).
  useEffect(() => {
    if (state?.ok) track("category_corrected", { scope: state.value.scope });
  }, [state]);
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="account" value={view.accountId} />
      <input type="hidden" name="movement" value={view.movementId} />
      <KindChoice kinds={view.kinds} kind={kind} onChoose={chooseKind} />
      <CategoryChoice
        kind={kind}
        value={category}
        onChoose={chooseCategory}
        isGuess={isGuess}
      />
      {children}
      <CorrectionButtons applyLabel={view.applyLabel} isPending={isPending} />
      <SaveStatus
        saved={state?.ok ? savedText(state.value) : null}
        isFailed={state?.ok === false}
      />
    </form>
  );
}
