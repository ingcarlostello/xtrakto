"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { POSTHOG_KEY } from "@/lib/analytics";
import { ANALYTICS_CONSENT } from "@/utils/analytics-consent.helpers";
import { ANALYTICS_COPY } from "../analytics.constants";
import { useAnalyticsConsent } from "../hooks/use-analytics-consent";

const COPY = ANALYTICS_COPY.notice;
const TITLE_ID = "analytics-consent-title";

/**
 * Asks once, in this browser, whether we may measure how the app is used
 * (ADR 0029), where analytics can start: with PostHog's key. Fixed above
 * the dock, so the page doesn't move when it appears after hydrating; both
 * answers weigh the same. Once answered it goes, and the focus goes on to
 * the page's content.
 */
export function ConsentNotice() {
  const { consent, choose } = useAnalyticsConsent();
  if (!POSTHOG_KEY || consent !== ANALYTICS_CONSENT.UNANSWERED) return null;
  const answer = (granted: boolean) => {
    choose(granted);
    document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
  };
  return (
    <section
      aria-labelledby={TITLE_ID}
      className="fixed inset-x-2 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-[560px] flex-col gap-3 rounded-lg bg-surface p-5 shadow-panel sm:bottom-28"
    >
      <h2 id={TITLE_ID} className="font-heading text-section font-semibold">
        {COPY.title}
      </h2>
      <p className="text-caption text-ink-secondary">
        {COPY.description} {COPY.changeLater}{" "}
        <Link
          href="/settings"
          className="font-bold text-primary underline-offset-4 hover:underline"
        >
          {COPY.settings}
        </Link>
        .
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" size="sm" onClick={() => answer(true)}>
          {COPY.accept}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => answer(false)}>
          {COPY.decline}
        </Button>
      </div>
    </section>
  );
}
