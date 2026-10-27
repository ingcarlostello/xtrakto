import {
  ANALYTICS_CONSENT,
  type AnalyticsConsent,
  consentFromStorage,
  consentToStorage,
} from "@/utils/analytics-consent.helpers";

// The person's answer about analytics, kept in this browser (ADR 0029).
// Browser only: it reads localStorage.

const STORAGE_KEY = "xtrakto:analytics-consent";

const listeners = new Set<() => void>();

// The answer given on this page when the browser can't keep it (storage
// blocked), so that the page still honors it until it reloads.
let unsaved: AnalyticsConsent | undefined;

/** The answer in this browser, or none while storage is blocked. */
export const readAnalyticsConsent = (): AnalyticsConsent => {
  if (unsaved !== undefined) return unsaved;
  try {
    return consentFromStorage(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return ANALYTICS_CONSENT.UNANSWERED;
  }
};

/** Keeps an answer and tells this page's readers. */
export const writeAnalyticsConsent = (granted: boolean): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, consentToStorage(granted));
    unsaved = undefined;
  } catch {
    unsaved = granted ? ANALYTICS_CONSENT.GRANTED : ANALYTICS_CONSENT.DENIED;
  }
  for (const listener of listeners) listener();
};

/** Calls back when the answer changes, on this page or in another tab. */
export const subscribeToAnalyticsConsent = (
  listener: () => void,
): (() => void) => {
  const onStorage = ({ key }: StorageEvent) => {
    if (key === STORAGE_KEY || key === null) listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
};
