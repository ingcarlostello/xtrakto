"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Tells PostHog the summary was opened, with nothing else (ADR 0029). */
export function SummaryViewed() {
  useEffect(() => {
    track("summary_viewed", {});
  }, []);
  return null;
}
