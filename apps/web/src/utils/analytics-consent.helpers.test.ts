import { describe, expect, it } from "vitest";
import {
  ANALYTICS_CONSENT,
  ANALYTICS_CONSENT_VERSION,
  consentFromStorage,
  consentToStorage,
} from "./analytics-consent.helpers";

describe("consentFromStorage", () => {
  it.each([
    { granted: true, consent: ANALYTICS_CONSENT.GRANTED },
    { granted: false, consent: ANALYTICS_CONSENT.DENIED },
  ])("reads back an answer of $granted", ({ granted, consent }) => {
    expect(consentFromStorage(consentToStorage(granted))).toBe(consent);
  });

  it.each([
    { case: "nothing kept", stored: null },
    { case: "damaged text", stored: '{"version":' },
    { case: "a value that isn't an answer", stored: '"granted"' },
    {
      case: "an answer to an older version",
      stored: JSON.stringify({ version: "2026-01-01", granted: true }),
    },
    {
      case: "an answer that isn't yes or no",
      stored: JSON.stringify({
        version: ANALYTICS_CONSENT_VERSION,
        granted: "yes",
      }),
    },
  ])("asks again after $case", ({ stored }) => {
    expect(consentFromStorage(stored)).toBe(ANALYTICS_CONSENT.UNANSWERED);
  });
});
