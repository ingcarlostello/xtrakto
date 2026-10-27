"use client";

import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { POSTHOG_KEY } from "@/lib/analytics";
import { ANALYTICS_CONSENT } from "@/utils/analytics-consent.helpers";
import { ANALYTICS_COPY } from "../analytics.constants";
import { useAnalyticsConsent } from "../hooks/use-analytics-consent";

const COPY = ANALYTICS_COPY.setting;

/**
 * The answer about analytics, to change at any time: on, PostHog may
 * receive the app's events; off, it stops and forgets this browser's id
 * (ADR 0029). Only where analytics can start, with PostHog's key; it waits
 * for the browser to read the answer.
 */
export function AnalyticsSetting() {
  const { consent, choose } = useAnalyticsConsent();
  if (!POSTHOG_KEY) return null;
  return (
    <Card variant="card">
      <CardHeader>
        <h2 className="font-heading text-body font-bold">{COPY.title}</h2>
        <CardDescription>{COPY.description}</CardDescription>
      </CardHeader>
      <label className="flex items-center gap-3 self-start text-sm font-bold">
        {COPY.label}
        <Switch
          checked={consent === ANALYTICS_CONSENT.GRANTED}
          disabled={consent === null}
          onCheckedChange={(checked) => choose(checked)}
        />
      </label>
    </Card>
  );
}
