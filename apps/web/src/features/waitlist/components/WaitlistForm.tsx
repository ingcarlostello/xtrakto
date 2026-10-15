"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import { useWaitlistForm } from "../hooks/use-waitlist-form";
import { WAITLIST_COPY } from "../waitlist.constants";
import { ConsentField } from "./ConsentField";
import { WaitlistField } from "./WaitlistField";

const COPY = WAITLIST_COPY.form;
const FAILED = WAITLIST_COPY.errors.failed;

/** What went wrong, on the attention surface with its dot (§3.5). */
function FailedNotice() {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-md bg-spending-surface p-4 text-caption"
    >
      <span className="mt-1.5 size-[9px] shrink-0 rounded-full bg-spending" />
      <p>
        <span className="block font-bold text-ink">{FAILED.title}</span>
        <span className="text-ink-secondary">{FAILED.detail}</span>
      </p>
    </div>
  );
}

type SubmitButtonProps = {
  isSending: boolean;
  isEnabled: boolean;
  /** Says why it is grey: the consent isn't checked yet. */
  reason?: string;
};

/**
 * Grey until the consent is checked, as the design draws it; focusable, so
 * its reason is read with it.
 */
function SubmitButton({ isSending, isEnabled, reason }: SubmitButtonProps) {
  const reasonId = useId();
  return (
    <>
      <Button
        type="submit"
        disabled={!isEnabled || isSending}
        focusableWhenDisabled
        aria-describedby={reason ? reasonId : undefined}
        className="w-full aria-disabled:bg-chart-axis aria-disabled:text-ink-secondary aria-disabled:opacity-100 aria-disabled:shadow-none"
      >
        {isSending ? COPY.sending : COPY.submit}
      </Button>
      {reason && (
        <p
          id={reasonId}
          className="-mt-2 text-center text-caption text-ink-muted"
        >
          {reason}
        </p>
      )}
    </>
  );
}

/** The waitlist form of the human's design. */
export function WaitlistForm() {
  const form = useWaitlistForm();
  // Once the box's own error shows, the button's reason would repeat it.
  const isWaitingForConsent = !form.hasConsent && !form.errors.consent;
  return (
    <form noValidate onSubmit={form.submit} className="grid gap-4">
      <WaitlistField
        name="name"
        type="text"
        autoComplete="name"
        label={COPY.name}
        placeholder={COPY.namePlaceholder}
        error={form.errors.name}
      />
      <WaitlistField
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        label={COPY.email}
        placeholder={COPY.emailPlaceholder}
        error={form.errors.email}
      />
      <ConsentField
        checked={form.hasConsent}
        onCheckedChange={form.setHasConsent}
        error={form.errors.consent}
      />
      {form.hasFailed && <FailedNotice />}
      <SubmitButton
        isSending={form.isSending}
        isEnabled={form.hasConsent}
        reason={isWaitingForConsent ? COPY.consentFirst : undefined}
      />
    </form>
  );
}
