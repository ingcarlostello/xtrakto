import type { CaptureResult, Properties } from "posthog-js";
import {
  ANALYTICS_EVENTS,
  type AnalyticsEvent,
} from "./analytics-events.constants";

// What PostHog needs to take an event in: the project's token, the random
// ids of the browser and of the session, the library and the time.
const DELIVERY_PROPERTIES = [
  "token",
  "distinct_id",
  "$device_id",
  "$session_id",
  "$lib",
  "$lib_version",
  "$insert_id",
  "$time",
];

// The browser, its system and the kind of device, as the SDK names them,
// and the host, which marks a local check as a test. Never the URL, the
// referrer, the raw user agent, the screen or the time zone.
const CONTEXT_PROPERTIES = ["$browser", "$os", "$device_type", "$host"];

const isAnalyticsEvent = (event: string): event is AnalyticsEvent =>
  Object.hasOwn(ANALYTICS_EVENTS, event);

const isPlainValue = (value: unknown): boolean =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

/**
 * PostHog's `before_send` (ADR 0029): only the events of
 * `ANALYTICS_EVENTS` go, the SDK's own (`$pageview`, `$autocapture`,
 * `$opt_in`, `$identify`…) never; each keeps its own properties and what
 * PostHog needs to receive it, without person properties (`$set`,
 * `$set_once`) and never making a person of it; and PostHog doesn't work
 * out the person's city from the IP.
 */
export const scrubCapture = (capture: CaptureResult): CaptureResult | null => {
  if (!isAnalyticsEvent(capture.event)) return null;
  const kept = new Set<string>([
    ...DELIVERY_PROPERTIES,
    ...CONTEXT_PROPERTIES,
    ...ANALYTICS_EVENTS[capture.event],
  ]);
  const properties: Properties = Object.fromEntries(
    Object.entries(capture.properties).filter(
      ([key, value]) => kept.has(key) && isPlainValue(value),
    ),
  );
  return {
    uuid: capture.uuid,
    event: capture.event,
    properties: {
      ...properties,
      $process_person_profile: false,
      $geoip_disable: true,
    },
    ...(capture.timestamp === undefined
      ? {}
      : { timestamp: capture.timestamp }),
  };
};
