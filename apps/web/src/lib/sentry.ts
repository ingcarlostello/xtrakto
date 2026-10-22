import type { init } from "@sentry/nextjs";
import {
  scrubBreadcrumb,
  scrubErrorEvent,
  scrubSpan,
} from "@/utils/sentry-scrub.helpers";

// Error monitoring with Sentry, in the browser (src/instrumentation-client.ts)
// and on the server (src/instrumentation.ts). Not server-only: the browser
// imports it too.

/**
 * Where Sentry's events go, or undefined where it stays off: locally and in
 * CI. Public by design, since the browser sends its errors there. Next.js
 * inlines it at build time, so it's read here by its literal name, not
 * through lib/env.ts, which is server-only; lib/env.ts still validates it
 * when a server starts.
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;

/**
 * What the browser and the server share. Sentry v11 collects everything by
 * default (cookies, headers, request bodies, a frame's variables, query
 * strings, the user's IP): `dataCollection` turns each category off, and the
 * hooks keep an allowlist of what the SDK still sends
 * (utils/sentry-scrub.helpers.ts). No Session Replay: it records the screen,
 * amounts included.
 */
export const SENTRY_OPTIONS = {
  // One request in ten is traced, to measure latency (system design §1).
  tracesSampleRate: 0.1,
  dataCollection: {
    userInfo: false,
    cookies: false,
    // The browser's name and version only.
    httpHeaders: { request: { allow: ["user-agent"] }, response: false },
    httpBodies: [],
    urlQueryParams: false,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
  },
  beforeSend: scrubErrorEvent,
  beforeSendSpan: scrubSpan,
  beforeBreadcrumb: scrubBreadcrumb,
} satisfies Parameters<typeof init>[0];
