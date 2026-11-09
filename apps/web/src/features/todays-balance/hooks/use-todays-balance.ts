"use client";

import { APP_ERROR_CODE, type AppError, type Result } from "@xtrakto/core";
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { saveTodaysBalance } from "../actions/save-todays-balance.action";
import { TODAYS_BALANCE_COPY as COPY } from "../todays-balance.constants";
import type {
  TodaysBalanceAnswer,
  TodaysBalanceOffer,
} from "../todays-balance.types";

// Where the focus goes once the form and the answer swap places: never on
// the page's first paint, only once the person acted.
const useFocusOnSwap = (isEditing: boolean) => {
  const field = useRef<HTMLInputElement>(null);
  const answered = useRef<HTMLDivElement>(null);
  const isPending = useRef(false);
  useEffect(() => {
    if (!isPending.current) return;
    isPending.current = false;
    (isEditing ? field : answered).current?.focus();
  }, [isEditing]);
  const focusOnSwap = () => {
    isPending.current = true;
  };
  return { field, answered, focusOnSwap };
};

// What to say of an answer that didn't come: nothing when it did.
const problemOf = (
  result: Result<TodaysBalanceAnswer, AppError> | undefined,
): string | undefined => {
  if (result?.ok) return undefined;
  return result?.error.code === APP_ERROR_CODE.INVALID_INPUT
    ? COPY.invalid
    : COPY.failed;
};

// What's typed, and checking it.
const useBalanceForm = (
  accountId: string,
  onAnswer: (answer: TodaysBalanceAnswer) => void,
) => {
  const [typed, setTyped] = useState("");
  const [problem, setProblem] = useState<string | undefined>();
  const [isChecking, startChecking] = useTransition();
  const check = (event: FormEvent) => {
    event.preventDefault();
    if (isChecking) return;
    startChecking(async () => {
      const result = await saveTodaysBalance({
        accountId,
        balance: typed,
      }).catch(() => undefined);
      setProblem(problemOf(result));
      if (result?.ok) onAnswer(result.value);
    });
  };
  return { typed, setTyped, problem, isChecking, check };
};

/** The field that checks today's balance: the form, or what it answered. */
export const useTodaysBalance = ({ accountId, answer }: TodaysBalanceOffer) => {
  const [shown, setShown] = useState(answer);
  const [isEditing, setIsEditing] = useState(answer === undefined);
  const { field, answered, focusOnSwap } = useFocusOnSwap(isEditing);
  const form = useBalanceForm(accountId, (value) => {
    setShown(value);
    focusOnSwap();
    setIsEditing(false);
  });
  const change = () => {
    form.setTyped("");
    focusOnSwap();
    setIsEditing(true);
  };
  return { shown, isEditing, change, field, answered, ...form };
};
