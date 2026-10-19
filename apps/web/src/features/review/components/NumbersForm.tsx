"use client";

import { useActionState } from "react";
import { RawTextChip } from "@/components/raw-text-chip/RawTextChip";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { answerNumbers } from "../actions/answer-numbers.action";
import { useCloseWhenSaved } from "../hooks/use-review-group";
import type { NumberView } from "../review-display.helpers";
import { REVIEW_ANSWERS, REVIEW_COPY as COPY } from "../review.constants";
import { KeepAnswerButton } from "./ChangeAnswerButtons";

type NumbersFormProps = {
  numbers: readonly NumberView[];
  accountId: string;
  /** The quarter, as the URL writes it. */
  period: string;
  /** Asked again: numbers already theirs stay so, and the answer can stay. */
  isChange: boolean;
};

// A number's row: the bank's text with its digits, what went there, and
// its switch, which sends its HMAC when it's on; "Es tuyo" once it is.
function NumberRow({ number }: { number: NumberView }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-divider py-3.5">
      <div className="flex min-w-0 flex-col items-start gap-1">
        <RawTextChip text={number.chip} />
        <p className="text-meta text-ink-muted">{number.detail}</p>
      </div>
      {number.isMine ? (
        <p className="text-sm font-bold text-ink-secondary">{COPY.isYours}</p>
      ) : (
        <label className="flex items-center gap-3 text-sm font-bold">
          {REVIEW_ANSWERS.my_number.label}
          <Switch
            name="mine"
            value={number.referenceHash}
            aria-label={number.label}
          />
        </label>
      )}
    </li>
  );
}

// "Guardar" sends the numbers marked, when one is left to mark; "Ninguno es
// mío" marks none, and asked again, the answer can stay as it is. While it
// sends, every button keeps its focus but waits.
function NumbersButtons({
  isChange,
  canMark,
  isPending,
}: {
  isChange: boolean;
  canMark: boolean;
  isPending: boolean;
}) {
  const wait = { disabled: isPending, focusableWhenDisabled: true } as const;
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {canMark && (
        <Button type="submit" name="answer" value="save" size="sm" {...wait}>
          {COPY.save}
        </Button>
      )}
      {isChange ? (
        <KeepAnswerButton />
      ) : (
        <Button
          type="submit"
          name="answer"
          value="none"
          size="sm"
          variant="secondary"
          {...wait}
        >
          {REVIEW_ANSWERS.not_mine.label}
        </Button>
      )}
    </div>
  );
}

/**
 * The Nequi numbers of the quick review (v8-02): one switch per number, then
 * "Guardar", which sends the numbers marked, and "Ninguno es mío".
 */
export function NumbersForm({
  numbers,
  accountId,
  period,
  isChange,
}: NumbersFormProps) {
  const [state, action, isPending] = useActionState(answerNumbers, null);
  useCloseWhenSaved(state);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="account" value={accountId} />
      <input type="hidden" name="period" value={period} />
      <ul aria-label={COPY.numbersLabel} className="flex flex-col">
        {numbers.map((number) => (
          <NumberRow key={number.referenceHash} number={number} />
        ))}
      </ul>
      <NumbersButtons
        isChange={isChange}
        canMark={numbers.some(({ isMine }) => !isMine)}
        isPending={isPending}
      />
      {state?.ok === false && (
        <p role="alert" className="text-caption font-semibold text-danger">
          {COPY.failed}
        </p>
      )}
    </form>
  );
}
