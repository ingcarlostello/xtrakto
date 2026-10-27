import { useSyncExternalStore } from "react";
import { chooseAnalytics } from "@/lib/analytics";
import {
  readAnalyticsConsent,
  subscribeToAnalyticsConsent,
} from "@/lib/analytics-consent";
import type { AnalyticsConsent } from "@/utils/analytics-consent.helpers";

// Unknown while the server renders and the page hydrates: only the browser
// keeps the answer.
const unknownOnTheServer = () => null;

/** The person's answer about analytics in this browser, and how to give one. */
export const useAnalyticsConsent = (): {
  readonly consent: AnalyticsConsent | null;
  readonly choose: (granted: boolean) => void;
} => ({
  consent: useSyncExternalStore(
    subscribeToAnalyticsConsent,
    readAnalyticsConsent,
    unknownOnTheServer,
  ),
  choose: chooseAnalytics,
});
