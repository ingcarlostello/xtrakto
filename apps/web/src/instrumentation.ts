import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_OPTIONS } from "./lib/sentry";

// Runs once when a server instance starts. If an environment variable is
// missing or invalid, the throw stops `next dev` and `next start` instead of
// failing the first request. Next replaces NEXT_RUNTIME at compile time, which
// keeps lib/env.ts out of the Edge bundle; that's why it's read here directly.
export async function register(): Promise<void> {
  // Set by Next.js per bundle, not by the deployment, so turbo.json doesn't list it.
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkServerEnv } = await import("./lib/env");
    checkServerEnv();
    // Sentry stays off without a DSN, locally and in CI. Requests to other
    // services (Clerk, Inngest) carry no tracing headers, which would hand
    // them the trace and the route.
    if (SENTRY_DSN)
      Sentry.init({
        dsn: SENTRY_DSN,
        ...SENTRY_OPTIONS,
        tracePropagationTargets: [],
      });
  }
}

// A server error (a page, a route handler, a server action, the proxy)
// reaches Sentry, scrubbed like any other event.
export const onRequestError = Sentry.captureRequestError;
