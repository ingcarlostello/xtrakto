import { type FormEvent, startTransition } from "react";

/**
 * Sends a form to its action with the button pressed, without the reset
 * React gives a form whose `action` succeeds: it would put its controlled
 * choices back to their first values while their state keeps the new ones,
 * and the next send would carry those.
 */
export const useSubmitWithoutReset =
  (dispatch: (form: FormData) => void) =>
  (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { nativeEvent } = event;
    const submitter =
      nativeEvent instanceof SubmitEvent ? nativeEvent.submitter : null;
    const form = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(form));
  };
