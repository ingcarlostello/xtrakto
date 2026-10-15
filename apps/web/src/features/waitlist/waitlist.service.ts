import "server-only";
import { addWaitlistEntry } from "@xtrakto/db";
import { getDb } from "@/lib/db";
import { withSanitizedErrors } from "@/utils/sanitized-error.utils";
import { CONSENT_VERSION } from "./waitlist.constants";
import type { WaitlistEntryValues } from "./waitlist.types";

/**
 * Adds someone to the waitlist with the version of the consent they saw. An
 * email already on it changes nothing, and nothing says so. Errors are thrown
 * without their message, which quotes the name and the email.
 */
export const addToWaitlist = ({
  name,
  email,
}: WaitlistEntryValues): Promise<void> =>
  withSanitizedErrors("WAITLIST_NOT_JOINED", () =>
    addWaitlistEntry(getDb(), { name, email, consentVersion: CONSENT_VERSION }),
  );
