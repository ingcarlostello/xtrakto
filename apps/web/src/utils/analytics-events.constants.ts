/**
 * The events PostHog may receive, each with the names of its properties:
 * the allowlist of ADR 0029. An event or a property joins it only with a
 * reason, and never carries an amount, a description, a name, a period or
 * a digit of an account.
 */
export const ANALYTICS_EVENTS = {
  // The summary opened with movements that count (docs/ui/v8-01).
  summary_viewed: [],
} as const satisfies Record<string, readonly string[]>;

export type AnalyticsEvent = keyof typeof ANALYTICS_EVENTS;

/** What an event carries: its own properties, as plain values. */
export type AnalyticsProperties<E extends AnalyticsEvent> = Readonly<
  Record<(typeof ANALYTICS_EVENTS)[E][number], string | number | boolean>
>;
