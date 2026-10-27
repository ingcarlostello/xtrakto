import { z } from "zod";

/** What the person answered, in this browser, about measuring their use. */
export const ANALYTICS_CONSENT = {
  GRANTED: "granted",
  DENIED: "denied",
  UNANSWERED: "unanswered",
} as const;

export type AnalyticsConsent =
  (typeof ANALYTICS_CONSENT)[keyof typeof ANALYTICS_CONSENT];

/**
 * The version of what the consent covers. A change the person should hear
 * about (what the events say, where they go) bumps it, so that the notice
 * asks again.
 */
export const ANALYTICS_CONSENT_VERSION = "2026-10-27";

const storedConsentSchema = z.object({
  version: z.literal(ANALYTICS_CONSENT_VERSION),
  granted: z.boolean(),
});

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/** The answer the browser kept: a missing, damaged or older one is no answer. */
export const consentFromStorage = (stored: string | null): AnalyticsConsent => {
  if (stored === null) return ANALYTICS_CONSENT.UNANSWERED;
  const answer = storedConsentSchema.safeParse(parseJson(stored));
  if (!answer.success) return ANALYTICS_CONSENT.UNANSWERED;
  return answer.data.granted
    ? ANALYTICS_CONSENT.GRANTED
    : ANALYTICS_CONSENT.DENIED;
};

/** How the browser keeps an answer, with the version it answered. */
export const consentToStorage = (granted: boolean): string =>
  JSON.stringify({ version: ANALYTICS_CONSENT_VERSION, granted });
