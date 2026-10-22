import type { Breadcrumb, ErrorEvent, init } from "@sentry/nextjs";

// What reaches Sentry, after `dataCollection` turns the SDK's own collection
// off (lib/sentry.ts): an allowlist, so that what a later SDK version adds
// stays out until it has a reason to go in. An error keeps its class, its
// message and its stack, the page's path and the runtime; never a request's
// body, cookies, query or headers, the user, a frame's variables, or a
// breadcrumb of the console or of what the person clicked or typed.

type SentryOptions = Parameters<typeof init>[0];
/** A span as Sentry streams it (`traceLifecycle: 'stream'`, v11's default). */
export type StreamedSpan = Parameters<
  NonNullable<SentryOptions["beforeSendSpan"]>
>[0];
type SentryRequest = NonNullable<ErrorEvent["request"]>;
type SentryContexts = NonNullable<ErrorEvent["contexts"]>;
type SentryTraceContext = NonNullable<SentryContexts["trace"]>;
type SentryException = NonNullable<
  NonNullable<ErrorEvent["exception"]>["values"]
>[number];
type SentryFrame = NonNullable<
  NonNullable<SentryException["stacktrace"]>["frames"]
>[number];
type Primitive = string | number | boolean;

const EMAIL = /[^\s@"'<>]+@[^\s@"'<>]+\.[a-z]{2,}/gi;
// A URL's query and fragment, which can carry a search (`?q=`) or upload
// job ids (`#jobs=`). The path before them stays.
const URL_TAIL = /((?:https?:\/\/|\/)[^\s?#"'<>]*)[?#][^\s"'<>]*/g;
// Amounts as Colombians and banks write them: `90.000`, `-15,000.00`, `11,24`.
// Not by the `$`, which also marks a SQL query's parameters (`$1`).
const GROUPED_AMOUNT = /-?\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?\b/g;
const DECIMAL_AMOUNT = /-?\b\d+[.,]\d{2}\b/g;
// Account, phone and ID numbers, as parsers mask them (ADR 0012). Shorter
// runs stay, so that a SQLSTATE (`23505`) still names what failed.
const LONG_NUMBER = /\d{6,}/g;

/** Text without emails, query strings, amounts or long numbers. */
export const scrubText = (text: string): string =>
  text
    .replace(EMAIL, "[email]")
    .replace(URL_TAIL, "$1")
    .replace(GROUPED_AMOUNT, "[amount]")
    .replace(DECIMAL_AMOUNT, "[amount]")
    .replace(LONG_NUMBER, "[number]");

const isPrimitive = (value: unknown): value is Primitive =>
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean";

const scrubValue = (value: Primitive): Primitive =>
  typeof value === "string" ? scrubText(value) : value;

/** A record's primitive values, scrubbed; nested objects stay out. */
const scrubRecord = (
  record: Record<string, unknown>,
  keys?: readonly string[],
): Record<string, Primitive> =>
  Object.fromEntries(
    Object.entries(record).flatMap(([key, value]) =>
      isPrimitive(value) && (keys === undefined || keys.includes(key))
        ? [[key, scrubValue(value)]]
        : [],
    ),
  );

// Where the person went and which requests the page made, by path. The
// console and the page's clicks and typing stay out: a log line or a
// clicked element's text can quote a movement.
const KEPT_BREADCRUMB_CATEGORIES = new Set([
  "navigation",
  "fetch",
  "xhr",
  "http",
]);
const KEPT_BREADCRUMB_DATA = ["from", "to", "url", "method", "status_code"];

/** A breadcrumb Sentry may keep, or null to drop it. */
export const scrubBreadcrumb = (breadcrumb: Breadcrumb): Breadcrumb | null =>
  KEPT_BREADCRUMB_CATEGORIES.has(breadcrumb.category ?? "")
    ? {
        type: breadcrumb.type,
        category: breadcrumb.category,
        level: breadcrumb.level,
        timestamp: breadcrumb.timestamp,
        data:
          breadcrumb.data && scrubRecord(breadcrumb.data, KEPT_BREADCRUMB_DATA),
      }
    : null;

/** The page's path and method, and the browser it came from. */
const scrubRequest = (request: SentryRequest): SentryRequest => {
  const userAgent = Object.entries(request.headers ?? {}).find(
    ([name]) => name.toLowerCase() === "user-agent",
  );
  return {
    url: request.url && scrubText(request.url),
    method: request.method,
    headers: userAgent && { [userAgent[0]]: userAgent[1] },
  };
};

const withoutVariables = (frame: SentryFrame): SentryFrame => {
  const kept = { ...frame };
  delete kept.vars;
  return kept;
};

const scrubException = (exception: SentryException): SentryException => ({
  ...exception,
  value: exception.value && scrubText(exception.value),
  stacktrace: exception.stacktrace && {
    ...exception.stacktrace,
    frames: exception.stacktrace.frames?.map(withoutVariables),
  },
});

// The runtime, the browser, the device and the route; not `otel` or `state`,
// which can carry a span's attributes or the page's state.
const KEPT_CONTEXTS: readonly string[] = [
  "app",
  "browser",
  "cloud_resource",
  "culture",
  "device",
  "nextjs",
  "os",
  "react",
  "response",
  "runtime",
];

const traceIdsOf = (trace: SentryTraceContext): SentryTraceContext => ({
  trace_id: trace.trace_id,
  span_id: trace.span_id,
  parent_span_id: trace.parent_span_id,
  op: trace.op,
  status: trace.status,
  origin: trace.origin,
});

const scrubContexts = (contexts: SentryContexts): SentryContexts => {
  const kept: SentryContexts = {};
  for (const name of KEPT_CONTEXTS) {
    const context = contexts[name];
    if (context) kept[name] = scrubRecord(context);
  }
  if (contexts.trace) kept.trace = traceIdsOf(contexts.trace);
  return kept;
};

/** An error event as Sentry may keep it: the `beforeSend` hook. */
export const scrubErrorEvent = (event: ErrorEvent): ErrorEvent => {
  const scrubbed: ErrorEvent = {
    ...event,
    message: event.message && scrubText(event.message),
    logentry: event.logentry && {
      message: event.logentry.message && scrubText(event.logentry.message),
    },
    exception: event.exception && {
      values: event.exception.values?.map(scrubException),
    },
    request: event.request && scrubRequest(event.request),
    breadcrumbs: event.breadcrumbs?.flatMap(
      (breadcrumb) => scrubBreadcrumb(breadcrumb) ?? [],
    ),
    contexts: event.contexts && scrubContexts(event.contexts),
    tags: event.tags && scrubRecord(event.tags),
    transaction: event.transaction && scrubText(event.transaction),
  };
  delete scrubbed.user;
  delete scrubbed.extra;
  delete scrubbed.threads;
  // The machine's name: a function's host on Vercel, a laptop's elsewhere.
  delete scrubbed.server_name;
  return scrubbed;
};

// A span's attributes that say what ran and how it went, never what it
// carried: the full URL and its query, headers, the client's address, the
// user and a query's parameters stay out.
const KEPT_SPAN_ATTRIBUTES = new Set([
  "http.request.method",
  "http.response.status_code",
  "http.route",
  "db.system.name",
  "db.operation.name",
  "db.collection.name",
  "db.query.text",
  "server.address",
  "url.path",
  "user_agent.original",
]);
const KEPT_SPAN_ATTRIBUTE_PREFIXES = [
  "sentry.",
  "browser.",
  "os.",
  "device.",
  "culture.",
  "cloud.",
  "process.runtime.",
  "code.",
];

const isKeptAttribute = (key: string): boolean =>
  KEPT_SPAN_ATTRIBUTES.has(key) ||
  KEPT_SPAN_ATTRIBUTE_PREFIXES.some((prefix) => key.startsWith(prefix));

const scrubAttribute = (value: unknown): unknown => {
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) return value.map(scrubAttribute);
  if (typeof value === "object" && value !== null && "value" in value)
    return { ...value, value: scrubAttribute(value.value) };
  return value;
};

/** A span as Sentry may keep it: the `beforeSendSpan` hook. */
export const scrubSpan = (span: StreamedSpan): StreamedSpan => {
  const scrubbed: StreamedSpan = {
    ...span,
    name: scrubText(span.name),
    attributes: Object.fromEntries(
      Object.entries(span.attributes)
        .filter(([key]) => isKeptAttribute(key))
        .map(([key, value]) => [key, scrubAttribute(value)]),
    ),
  };
  delete scrubbed.links;
  return scrubbed;
};
