"use client";

import { type FormEventHandler, type Ref, useId } from "react";
import { StatusPill } from "@/components/status-pill/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTodaysBalance } from "../hooks/use-todays-balance";
import { TODAYS_BALANCE_COPY as COPY } from "../todays-balance.constants";
import { answerPill } from "../todays-balance.helpers";
import type {
  TodaysBalanceAnswer,
  TodaysBalanceOffer,
} from "../todays-balance.types";

type BalanceInputProps = {
  id: string;
  describedBy: string;
  fieldRef: Ref<HTMLInputElement>;
  typed: string;
  onType: (typed: string) => void;
  isInvalid: boolean;
  isChecking: boolean;
};

// A white pill with its peso sign inside (docs/ui/v8-09's field).
function BalanceInput({
  id,
  describedBy,
  fieldRef,
  typed,
  onType,
  isInvalid,
  isChecking,
}: BalanceInputProps) {
  return (
    <div className="relative min-w-0 flex-[1_1_12rem]">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-muted"
      >
        $
      </span>
      <Input
        ref={fieldRef}
        id={id}
        value={typed}
        onChange={(event) => onType(event.currentTarget.value)}
        readOnly={isChecking}
        inputMode="decimal"
        autoComplete="off"
        placeholder={COPY.placeholder}
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy}
        className="rounded-full pl-8 shadow-chip"
      />
    </div>
  );
}

// What the field asks, and which balance it wants.
function BalanceHint({ id }: { id: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h3 className="text-sm font-bold">{COPY.title}</h3>
      <p id={id} className="text-caption text-ink-secondary">
        {COPY.hint}
      </p>
    </div>
  );
}

function BalanceProblem({ id, problem }: { id: string; problem: string }) {
  return (
    <p id={id} role="alert" className="text-caption font-semibold text-danger">
      {problem}
    </p>
  );
}

type BalanceFormProps = Pick<
  BalanceInputProps,
  "fieldRef" | "typed" | "onType" | "isChecking"
> & {
  problem: string | undefined;
  onCheck: FormEventHandler<HTMLFormElement>;
};

// "¿Cuánto ves hoy en tu banco?" with its field and "Comprobar", which keeps
// its focus while it checks.
function BalanceForm({
  fieldRef,
  typed,
  onType,
  problem,
  isChecking,
  onCheck,
}: BalanceFormProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const problemId = `${id}-problem`;
  return (
    <form onSubmit={onCheck} noValidate className="flex flex-col gap-2.5">
      <BalanceHint id={hintId} />
      <label htmlFor={id} className="text-caption font-bold">
        {COPY.label}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <BalanceInput
          id={id}
          describedBy={problem ? `${hintId} ${problemId}` : hintId}
          fieldRef={fieldRef}
          typed={typed}
          onType={onType}
          isInvalid={problem !== undefined}
          isChecking={isChecking}
        />
        <Button type="submit" disabled={isChecking} focusableWhenDisabled>
          {isChecking ? COPY.checking : COPY.check}
        </Button>
      </div>
      {problem && <BalanceProblem id={problemId} problem={problem} />}
    </form>
  );
}

type AnswerRowProps = {
  answeredRef: Ref<HTMLDivElement>;
  answer: TodaysBalanceAnswer;
  onChange: () => void;
};

// What it came to, in a status pill, and the way to type another one.
function AnswerRow({ answeredRef, answer, onChange }: AnswerRowProps) {
  return (
    <div
      ref={answeredRef}
      tabIndex={-1}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
    >
      <StatusPill {...answerPill(answer)} />
      <Button variant="link" onClick={onChange}>
        {COPY.change}
      </Button>
    </div>
  );
}

/**
 * Today's balance, in a movements file's result (10.3; v8 doesn't draw it):
 * the field that compares it with what was added up since the last
 * statement, and what that came to, with the way to type another one.
 */
export function TodaysBalanceBox({ offer }: { offer: TodaysBalanceOffer }) {
  const {
    shown,
    isEditing,
    typed,
    setTyped,
    problem,
    isChecking,
    check,
    change,
    field,
    answered,
  } = useTodaysBalance(offer);
  return (
    <div className="rounded-md bg-primary-soft-2 p-4">
      {isEditing || !shown ? (
        <BalanceForm
          fieldRef={field}
          typed={typed}
          onType={setTyped}
          problem={problem}
          isChecking={isChecking}
          onCheck={check}
        />
      ) : (
        <AnswerRow answeredRef={answered} answer={shown} onChange={change} />
      )}
    </div>
  );
}
