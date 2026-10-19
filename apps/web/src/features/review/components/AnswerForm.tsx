"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { answerReview } from "../actions/answer-review.action";
import { REVIEW_COPY } from "../review.constants";
import type { ReviewAnswerId, ReviewGroupId } from "../review.types";

type Answers = readonly { id: ReviewAnswerId; label: string }[];

type AnswerFormProps = {
  group: ReviewGroupId;
  answers: Answers;
  accountId: string;
  /** The quarter, as the URL writes it. */
  period: string;
};

// The suggested answer first, as the primary button (design-system.md §9,
// Answer). While the form sends, every button keeps its focus but waits.
function AnswerButtons({
  answers,
  isPending,
}: {
  answers: Answers;
  isPending: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={REVIEW_COPY.answersLabel}
      className="flex flex-wrap items-center gap-2.5"
    >
      {answers.map(({ id, label }, index) => (
        <Button
          key={id}
          type="submit"
          name="answer"
          value={id}
          size="sm"
          variant={index === 0 ? "primary" : "secondary"}
          disabled={isPending}
          focusableWhenDisabled
        >
          {label}
        </Button>
      ))}
      <p className="text-caption text-ink-muted">{REVIEW_COPY.suggested}</p>
    </div>
  );
}

/** A group's answers, each a button of one form that sends the group, the account and the quarter. */
export function AnswerForm({
  group,
  answers,
  accountId,
  period,
}: AnswerFormProps) {
  const [state, action, isPending] = useActionState(answerReview, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="group" value={group} />
      <input type="hidden" name="account" value={accountId} />
      <input type="hidden" name="period" value={period} />
      <AnswerButtons answers={answers} isPending={isPending} />
      {state?.ok === false && (
        <p role="alert" className="text-caption font-semibold text-danger">
          {REVIEW_COPY.failed}
        </p>
      )}
    </form>
  );
}
