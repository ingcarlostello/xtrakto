"use client";

import { X } from "lucide-react";
import { useActionState, useEffect } from "react";
import { IconButton } from "@/components/ui/button";
import { removeOwnRule } from "../actions/remove-own-rule.action";
import { YOURS_COPY as COPY } from "../user.constants";

type RemoveOwnRuleButtonProps = {
  ruleId: string;
  /** What it undoes, for screen readers: "Ya no es mío: Nequi terminado en 1270". */
  label: string;
  /** The element that takes the focus once its row goes. */
  focusOnDone: string;
};

/**
 * The "×" of something the user made theirs: it undoes its rule, as a
 * movement's detail does (6.3h). While it does, it keeps its focus and
 * can't be pressed again; a failure says so on a row of its own. Its form
 * adds no box, so the button and the message sit in the row's grid.
 */
export function RemoveOwnRuleButton({
  ruleId,
  label,
  focusOnDone,
}: RemoveOwnRuleButtonProps) {
  const [state, remove, isPending] = useActionState(removeOwnRule, null);
  useEffect(() => {
    if (state?.ok) document.getElementById(focusOnDone)?.focus();
  }, [state, focusOnDone]);
  return (
    <form action={remove} className="contents">
      <input type="hidden" name="rule" value={ruleId} />
      <IconButton
        type="submit"
        label={label}
        disabled={isPending}
        focusableWhenDisabled
      >
        <X aria-hidden strokeWidth={2} />
      </IconButton>
      {state && !state.ok && (
        <p
          role="alert"
          className="col-span-full pt-2 text-caption font-semibold text-danger"
        >
          {COPY.failed}
        </p>
      )}
    </form>
  );
}
