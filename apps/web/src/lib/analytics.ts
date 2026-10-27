import type { PostHog, PostHogConfig } from "posthog-js";
import { ANALYTICS_CONSENT } from "@/utils/analytics-consent.helpers";
import type {
  AnalyticsEvent,
  AnalyticsProperties,
} from "@/utils/analytics-events.constants";
import { scrubCapture } from "@/utils/posthog-scrub.helpers";
import {
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "./analytics-consent";

// Product analytics with PostHog, from the browser and only after the
// person's consent (ADR 0029). Browser only.

/**
 * PostHog's project key, or undefined where analytics stays off: locally
 * and in CI. Public by design, as the browser sends its events with it.
 * Next.js inlines it at build time, so it's read here by its literal name;
 * lib/env.ts still validates it when a server starts.
 */
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || undefined;

/**
 * Only the events the app sends: nothing PostHog would capture on its own,
 * no remote configuration or scripts, nobody identified, and `before_send`
 * keeps an allowlist (utils/posthog-scrub.helpers.ts). Its id stays in
 * localStorage, never in a cookie, and opting out deletes it.
 */
const POSTHOG_OPTIONS = {
  // PostHog Cloud in the United States, as the app's other services.
  api_host: "https://us.i.posthog.com",
  defaults: "2026-08-30",
  persistence: "localStorage",
  opt_out_persistence_by_default: true,
  person_profiles: "identified_only",
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  capture_exceptions: false,
  capture_performance: false,
  capture_heatmaps: false,
  capture_dead_clicks: false,
  rageclick: false,
  disable_session_recording: true,
  disable_surveys: true,
  disable_product_tours: true,
  disable_conversations: true,
  disable_web_experiments: true,
  disable_scroll_properties: true,
  advanced_disable_flags: true,
  disable_external_dependency_loading: true,
  save_referrer: false,
  save_campaign_params: false,
  before_send: scrubCapture,
} satisfies Partial<PostHogConfig>;

let loading: Promise<PostHog | undefined> | undefined;

// The SDK downloads the first time it's needed, never with a page: someone
// who doesn't consent never loads it. Analytics never breaks a page: a
// failed download sends nothing, and the next event tries again.
const withPostHog = (key: string, use: (posthog: PostHog) => void): void => {
  loading ??= import("posthog-js").then(
    ({ posthog }) => {
      posthog.init(key, POSTHOG_OPTIONS);
      return posthog;
    },
    () => {
      loading = undefined;
      return undefined;
    },
  );
  void loading.then((posthog) => posthog && use(posthog));
};

/** Sends an event, only with PostHog's key and the person's consent. */
export const track = <E extends AnalyticsEvent>(
  event: E,
  properties: AnalyticsProperties<E>,
): void => {
  if (!POSTHOG_KEY || readAnalyticsConsent() !== ANALYTICS_CONSENT.GRANTED)
    return;
  withPostHog(POSTHOG_KEY, (posthog) => {
    // Consent withdrawn on an earlier visit left PostHog opted out.
    if (posthog.has_opted_out_capturing())
      posthog.opt_in_capturing({ captureEventName: false });
    posthog.capture(event, properties);
  });
};

/**
 * Keeps the person's answer. Withdrawing a consent given before opts PostHog
 * out, which deletes the id it kept in this browser, loading it if this page
 * hadn't.
 */
export const chooseAnalytics = (granted: boolean): void => {
  const wasGranted = readAnalyticsConsent() === ANALYTICS_CONSENT.GRANTED;
  writeAnalyticsConsent(granted);
  if (!POSTHOG_KEY || !wasGranted || granted) return;
  withPostHog(POSTHOG_KEY, (posthog) => posthog.opt_out_capturing());
};
