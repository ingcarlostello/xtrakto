import { type RefObject, useEffect } from "react";
import { RULE_CHANGE, SAVE_STATUS_ATTRIBUTE } from "../transaction.constants";
import type { RuleChange, RuleChangeState } from "../transaction.types";

const SAVED = `[${SAVE_STATUS_ATTRIBUTE}]`;

// What takes the focus once a change is saved: the button that takes the
// place of the one pressed, or what was saved when its row is gone.
const NEXT_FOCUS = {
  [RULE_CHANGE.MINE]: `[name="intent"][value="${RULE_CHANGE.UNDO_NUMBER}"]`,
  [RULE_CHANGE.UNDO_NUMBER]: `[name="intent"][value="${RULE_CHANGE.MINE}"]`,
  [RULE_CHANGE.UNDO_TEXT]: SAVED,
} as const satisfies Record<RuleChange, string>;

/**
 * Keeps the focus in the detail's own block after a change, since the
 * button pressed leaves with it: on the one that takes its place, else on
 * what was saved.
 */
export const useFocusAfterRuleChange = (
  form: RefObject<HTMLFormElement | null>,
  state: RuleChangeState,
) => {
  useEffect(() => {
    if (!state?.ok) return;
    const next =
      form.current?.querySelector<HTMLElement>(NEXT_FOCUS[state.value]) ??
      form.current?.querySelector<HTMLElement>(SAVED);
    next?.focus();
  }, [form, state]);
};
