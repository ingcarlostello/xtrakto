import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import {
  scrubBreadcrumb,
  scrubErrorEvent,
  scrubSpan,
  scrubText,
  type StreamedSpan,
} from "./sentry-scrub.helpers";

// Invented values. Each one an event could leak is listed in LEAKS, and no
// scrubbed event may contain any of them.
const SEARCH = "transf%20a%20ana";
const EMAIL = "ana.prueba@example.com";
const PHONE = "3001234567";
const AMOUNT = "$150.000";
const BANK_TEXT = "TRANSF A Ana Prueba";
const COOKIE = "secret-session-cookie";
const IP = "203.0.113.7";
const BODY = "secret-statement-content";
const HOST = "ana-prueba-laptop.local";
const LEAKS = [
  SEARCH,
  EMAIL,
  PHONE,
  "150.000",
  BANK_TEXT,
  COOKIE,
  IP,
  BODY,
  HOST,
];
const USER_AGENT = "Mozilla/5.0 (Macintosh) Chrome/141.0";

const SOURCE_MAP = {
  type: "sourcemap",
  code_file: "app:///_next/static/chunks/upload.js",
  debug_id: "debug-1",
} as const;

const frame = {
  filename: "app:///_next/static/chunks/upload.js",
  function: "submitStatement",
  lineno: 12,
  colno: 4,
  in_app: true,
  context_line: "throw new Error(message);",
  vars: { description: BANK_TEXT, phone: PHONE },
};

const leakyEvent = (): ErrorEvent => ({
  type: undefined,
  event_id: "event-1",
  level: "error",
  release: "release-1",
  environment: "vercel-production",
  server_name: HOST,
  message: `Saving ${AMOUNT} for ${EMAIL}`,
  logentry: { message: `Opened /transactions?q=${SEARCH}`, params: [BODY] },
  exception: {
    values: [
      {
        type: "TypeError",
        value: `Cannot read amount of ${PHONE} at /transactions?q=${SEARCH}`,
        mechanism: { type: "onerror", handled: false },
        stacktrace: { frames: [frame] },
      },
    ],
  },
  request: {
    url: `https://xtrakto.site/transactions?q=${SEARCH}#movement-1`,
    method: "POST",
    data: BODY,
    query_string: `q=${SEARCH}`,
    cookies: { __session: COOKIE },
    env: { REMOTE_ADDR: IP },
    headers: {
      Cookie: `__session=${COOKIE}`,
      "User-Agent": USER_AGENT,
      "X-Forwarded-For": IP,
      Referer: `https://xtrakto.site/transactions?q=${SEARCH}`,
    },
  },
  user: { id: "user-1", email: EMAIL, ip_address: IP },
  extra: { statement: BODY },
  tags: { route: `/transactions?q=${SEARCH}`, handled: false },
  transaction: `POST /transactions?q=${SEARCH}`,
  contexts: {
    browser: { name: "Chrome", version: "141.0" },
    nextjs: {
      request_path: `/transactions?q=${SEARCH}`,
      route_type: "action",
    },
    response: { status_code: 500, headers: { "set-cookie": COOKIE } },
    otel: { attributes: { "url.full": `/transactions?q=${SEARCH}` } },
    state: { state: { type: "redux", value: { search: SEARCH } } },
    trace: {
      trace_id: "trace-1",
      span_id: "span-1",
      op: "http.server",
      data: { "url.query": `q=${SEARCH}`, "client.address": IP },
    },
  },
  breadcrumbs: [
    { category: "console", message: `Saved ${BANK_TEXT}` },
    { category: "ui.click", message: `button[aria-label="${BANK_TEXT}"]` },
    {
      category: "navigation",
      data: { from: "/upload#jobs=job-1", to: `/transactions?q=${SEARCH}` },
    },
  ],
  debug_meta: { images: [SOURCE_MAP] },
});

const span = (attributes: Record<string, unknown>): StreamedSpan => ({
  trace_id: "trace-1",
  span_id: "span-2",
  name: `GET /transactions?q=${SEARCH}`,
  start_timestamp: 1,
  end_timestamp: 2,
  status: "ok",
  is_segment: true,
  attributes,
  links: [
    {
      trace_id: "trace-0",
      span_id: "span-0",
      attributes: { "url.full": SEARCH },
    },
  ],
});

const expectNoLeaks = (scrubbed: unknown) => {
  const json = JSON.stringify(scrubbed);
  for (const leak of LEAKS) expect(json).not.toContain(leak);
};

describe("scrubText", () => {
  it.each([
    [`Mail ${EMAIL} failed`, "Mail [email] failed"],
    [`GET /transactions?q=${SEARCH}&movement=1`, "GET /transactions"],
    ["https://xtrakto.site/upload#jobs=a,b", "https://xtrakto.site/upload"],
    [`Paid ${AMOUNT} twice`, "Paid $[amount] twice"],
    ["Balance -15,000.00 off", "Balance [amount] off"],
    ["Total 1.234.567", "Total [amount]"],
    ["Interest 11,24", "Interest [amount]"],
    [`Nequi ${PHONE}`, "Nequi [number]"],
    ["INTERES INV VIRT 27608017525", "INTERES INV VIRT [number]"],
  ])("scrubs %j", (text, scrubbed) => {
    expect(scrubText(text)).toBe(scrubbed);
  });

  it.each([
    "save statement: DatabaseError 23505 transactions_fingerprint_unique",
    "connect ECONNREFUSED",
    "Unexpected token at line 42, column 7",
    "Why did it fail?",
  ])("keeps %j, which names a failure without data", (text) => {
    expect(scrubText(text)).toBe(text);
  });
});

describe("scrubErrorEvent", () => {
  it("keeps the error, its stack, the page's path and the runtime, and nothing else", () => {
    expect(scrubErrorEvent(leakyEvent())).toEqual({
      type: undefined,
      event_id: "event-1",
      level: "error",
      release: "release-1",
      environment: "vercel-production",
      message: "Saving $[amount] for [email]",
      logentry: { message: "Opened /transactions" },
      exception: {
        values: [
          {
            type: "TypeError",
            value: "Cannot read amount of [number] at /transactions",
            mechanism: { type: "onerror", handled: false },
            stacktrace: {
              frames: [
                {
                  filename: frame.filename,
                  function: frame.function,
                  lineno: 12,
                  colno: 4,
                  in_app: true,
                  context_line: frame.context_line,
                },
              ],
            },
          },
        ],
      },
      request: {
        url: "https://xtrakto.site/transactions",
        method: "POST",
        headers: { "User-Agent": USER_AGENT },
      },
      tags: { route: "/transactions", handled: false },
      transaction: "POST /transactions",
      contexts: {
        browser: { name: "Chrome", version: "141.0" },
        nextjs: { request_path: "/transactions", route_type: "action" },
        response: { status_code: 500 },
        trace: { trace_id: "trace-1", span_id: "span-1", op: "http.server" },
      },
      breadcrumbs: [
        {
          category: "navigation",
          data: { from: "/upload", to: "/transactions" },
        },
      ],
      debug_meta: { images: [SOURCE_MAP] },
    });
  });

  it("lets none of the event's data through", () => {
    expectNoLeaks(scrubErrorEvent(leakyEvent()));
  });

  it("leaves the event it was given untouched", () => {
    const event = leakyEvent();

    scrubErrorEvent(event);

    expect(event).toEqual(leakyEvent());
  });

  it("keeps an event without request, exception or contexts as it is", () => {
    const event: ErrorEvent = { type: undefined, event_id: "event-2" };

    expect(scrubErrorEvent(event)).toEqual(event);
  });
});

describe("scrubBreadcrumb", () => {
  it.each(["console", "ui.click", "ui.input", "sentry.event", undefined])(
    "drops a %s breadcrumb",
    (category) => {
      expect(scrubBreadcrumb({ category, message: BANK_TEXT })).toBeNull();
    },
  );

  it("keeps a request's path, method and status, without its message or sizes", () => {
    const breadcrumb: Breadcrumb = {
      type: "http",
      category: "fetch",
      level: "info",
      timestamp: 1,
      message: BANK_TEXT,
      data: {
        url: `/transactions?q=${SEARCH}`,
        method: "POST",
        status_code: 500,
        request_body_size: 1200,
        request_body: BODY,
      },
    };

    expect(scrubBreadcrumb(breadcrumb)).toEqual({
      type: "http",
      category: "fetch",
      level: "info",
      timestamp: 1,
      data: { url: "/transactions", method: "POST", status_code: 500 },
    });
  });
});

describe("scrubSpan", () => {
  it("keeps what ran and how it went, without the URL's query, headers, address or user", () => {
    const scrubbed = scrubSpan(
      span({
        "sentry.op": "http.server",
        "http.request.method": "GET",
        "http.response.status_code": 200,
        "http.route": "/transactions",
        "db.query.text": "select * from transactions where id = $1 limit 30",
        "browser.web_vital.lcp.value": { value: 1200, unit: "millisecond" },
        "url.full": `https://xtrakto.site/transactions?q=${SEARCH}`,
        "url.query": `q=${SEARCH}`,
        "http.request.header.cookie": [COOKIE],
        "client.address": IP,
        "network.peer.address": IP,
        "user.email": EMAIL,
        "db.query.parameter.0": PHONE,
        "next.span_name": `GET /transactions?q=${SEARCH}`,
      }),
    );

    expect(scrubbed).toEqual({
      trace_id: "trace-1",
      span_id: "span-2",
      name: "GET /transactions",
      start_timestamp: 1,
      end_timestamp: 2,
      status: "ok",
      is_segment: true,
      attributes: {
        "sentry.op": "http.server",
        "http.request.method": "GET",
        "http.response.status_code": 200,
        "http.route": "/transactions",
        "db.query.text": "select * from transactions where id = $1 limit 30",
        "browser.web_vital.lcp.value": { value: 1200, unit: "millisecond" },
      },
    });
    expectNoLeaks(scrubbed);
  });

  it("scrubs the text a kept attribute carries, also inside an attribute object or a list", () => {
    const scrubbed = scrubSpan(
      span({
        "url.path": `/transactions?q=${SEARCH}`,
        "sentry.segment.name": { value: `GET /review?account=${PHONE}` },
        "code.function": [`saveStatement ${PHONE}`, 3],
      }),
    );

    expect(scrubbed.attributes).toEqual({
      "url.path": "/transactions",
      "sentry.segment.name": { value: "GET /review" },
      "code.function": ["saveStatement [number]", 3],
    });
  });
});
