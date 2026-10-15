import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { WAITLIST_ROUTES } from "@/lib/auth-routes";
import { joinWaitlist } from "../actions/join-waitlist.action";
import {
  readWaitlistForm,
  WAITLIST_FIELDS,
  waitlistFormErrors,
} from "../waitlist-form.helpers";
import type { WaitlistFieldErrors } from "../waitlist.types";

/** Moves the focus to the first field with a problem; false if none has. */
const focusFirstInvalid = (
  form: HTMLFormElement,
  errors: WaitlistFieldErrors,
): boolean => {
  const field = WAITLIST_FIELDS.find((name) => errors[name]);
  const element = field ? form.elements.namedItem(field) : null;
  if (element instanceof HTMLElement) element.focus();
  return field !== undefined;
};

/**
 * Sends the waitlist form. The action's own schema checks it first, so a
 * mistake shows at its field without a request; then it joins and moves to
 * the "joined" page. A failure, which includes a page older than the last
 * deploy, asks for a reload.
 */
export const useWaitlistForm = () => {
  const router = useRouter();
  const [hasConsent, setHasConsent] = useState(false);
  const [errors, setErrors] = useState<WaitlistFieldErrors>({});
  const [isSending, setIsSending] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const values = readWaitlistForm(new FormData(event.currentTarget));
    const found = waitlistFormErrors(values);
    setErrors(found);
    setHasFailed(false);
    if (focusFirstInvalid(event.currentTarget, found)) return;
    setIsSending(true);
    // An unexpected failure (the database, a stale page) rejects the action.
    const result = await joinWaitlist(values).catch(() => null);
    if (result?.ok) return router.push(WAITLIST_ROUTES.joined);
    setHasFailed(true);
    setIsSending(false);
  };

  return { hasConsent, setHasConsent, errors, isSending, hasFailed, submit };
};
