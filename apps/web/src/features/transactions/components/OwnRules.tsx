"use client";

import { type LucideIcon, Smartphone, Tag } from "lucide-react";
import { type ReactNode, useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { changeMovementRule } from "../actions/change-movement-rule.action";
import { useFocusAfterRuleChange } from "../hooks/use-focus-after-rule-change";
import { ruleChangedText } from "../own-rules.helpers";
import { RULE_CHANGE, TRANSACTIONS_COPY } from "../transaction.constants";
import type { OwnRulesView, RuleChange } from "../transaction.types";
import { SaveStatus } from "./SaveStatus";

const COPY = TRANSACTIONS_COPY.detail;

type RuleRowProps = {
  icon: LucideIcon;
  title: string;
  line: string;
  /** Its buttons, which wait while the form sends. */
  children: ReactNode;
};

// A neutral chip, what the row is, what it says, and its buttons under it.
function RuleRow({ icon: Icon, title, line, children }: RuleRowProps) {
  return (
    <li className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-3.5 gap-y-1 border-t border-divider pt-3">
      <span
        aria-hidden
        className="row-span-2 flex size-11 items-center justify-center rounded-full bg-surface-muted text-ink"
      >
        <Icon strokeWidth={1.7} className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-caption text-ink-muted">{line}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {children}
      </div>
    </li>
  );
}

const NUMBER_LINES = {
  unknown: COPY.numberUnknown,
  mine: COPY.numberMine,
  theirs: COPY.numberTheirs,
} as const;

// "Deshacer", read with what it undoes. While the form sends, it keeps its
// focus but waits.
function UndoButton({
  intent,
  label,
  isPending,
}: {
  intent: RuleChange;
  label: string;
  isPending: boolean;
}) {
  return (
    <Button
      type="submit"
      name="intent"
      value={intent}
      variant="link"
      aria-label={label}
      disabled={isPending}
      focusableWhenDisabled
    >
      {COPY.undo}
    </Button>
  );
}

// Its Nequi number: "Es mío" until it's the user's, "Deshacer" once they
// answered.
function NumberRow({
  number,
  isPending,
}: {
  number: NonNullable<OwnRulesView["number"]>;
  isPending: boolean;
}) {
  return (
    <RuleRow
      icon={Smartphone}
      title={number.label}
      line={NUMBER_LINES[number.state]}
    >
      {number.state !== "mine" && (
        <Button
          type="submit"
          name="intent"
          value={RULE_CHANGE.MINE}
          variant="secondary"
          size="sm"
          disabled={isPending}
          focusableWhenDisabled
        >
          {COPY.markMine}
        </Button>
      )}
      {number.state !== "unknown" && (
        <UndoButton
          intent={RULE_CHANGE.UNDO_NUMBER}
          label={`${COPY.undo}: ${number.label}`}
          isPending={isPending}
        />
      )}
    </RuleRow>
  );
}

/**
 * A movement's Nequi number, which the user can make theirs, and their
 * rules for its number or its text, which they can undo (6.3h): its
 * movements then take what their other rules or the table's say. With
 * neither it takes no room, and stays to say what was undone.
 */
export function OwnRules({ view }: { view: OwnRulesView }) {
  const [state, action, isPending] = useActionState(changeMovementRule, null);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusAfterRuleChange(formRef, state);
  const hasRows = view.number !== null || view.textRule !== null;
  return (
    <form
      ref={formRef}
      action={action}
      className={hasRows ? "flex flex-col gap-3" : "contents"}
    >
      <input type="hidden" name="account" value={view.accountId} />
      <input type="hidden" name="movement" value={view.movementId} />
      {hasRows && (
        <ul className="flex flex-col gap-3">
          {view.number && (
            <NumberRow number={view.number} isPending={isPending} />
          )}
          {view.textRule && (
            <RuleRow
              icon={Tag}
              title={COPY.textRule}
              line={`${COPY.textRuleSays} ${view.textRule}.`}
            >
              <UndoButton
                intent={RULE_CHANGE.UNDO_TEXT}
                label={COPY.undoTextRule}
                isPending={isPending}
              />
            </RuleRow>
          )}
        </ul>
      )}
      <SaveStatus
        saved={state?.ok ? ruleChangedText(state.value) : null}
        isFailed={state?.ok === false}
      />
    </form>
  );
}
