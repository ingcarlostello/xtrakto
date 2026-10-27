/**
 * The events PostHog may receive, each with the names of its properties:
 * the allowlist of ADR 0029. An event or a property joins it only with a
 * reason, and never carries an amount, a description, a name, a period or
 * a digit of an account.
 */
export const ANALYTICS_EVENTS = {
  // The summary opened with movements that count (docs/ui/v8-01).
  summary_viewed: [],
  // A file the server took: its format and how many movements it read, as
  // a range.
  statement_uploaded: ["format_id", "movements"],
  // A file that didn't get through: where it stopped (the browser, the send
  // or the ingestion), its code, and its format when it was read.
  ingestion_failed: ["stage", "error_code", "format_id"],
  // A movement's category corrected in its detail: for it alone, or for
  // every one with its text.
  category_corrected: ["scope"],
} as const satisfies Record<string, readonly string[]>;

export type AnalyticsEvent = keyof typeof ANALYTICS_EVENTS;

/** What an event carries: some of its own properties, as plain values. */
export type AnalyticsProperties<E extends AnalyticsEvent> = Readonly<
  Partial<
    Record<(typeof ANALYTICS_EVENTS)[E][number], string | number | boolean>
  >
>;

/** An event with its properties, as `track` sends it. */
export type AnalyticsCall = {
  [E in AnalyticsEvent]: {
    readonly event: E;
    readonly properties: AnalyticsProperties<E>;
  };
}[AnalyticsEvent];
