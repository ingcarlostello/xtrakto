import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_OPTIONS } from "@/lib/sentry";

// Sentry in the browser, set up before the page becomes interactive. It stays
// off without a DSN, locally and in CI. No breadcrumbs of the console or of
// what the person clicks or types: a log line or a clicked element's text can
// quote a movement.
if (SENTRY_DSN)
  Sentry.init({
    dsn: SENTRY_DSN,
    ...SENTRY_OPTIONS,
    integrations: (defaults) => [
      ...defaults.filter(
        ({ name }) => name !== "Console" && name !== "Breadcrumbs",
      ),
      Sentry.breadcrumbsIntegration({ dom: false }),
    ],
  });

// Traces the App Router's navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
