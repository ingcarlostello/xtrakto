import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import { jobEvents, queueEvents } from "../upload-events.helpers";
import { sentJobIds } from "../upload-jobs.helpers";
import type { UploadItem, UploadJob } from "../upload.types";

/**
 * Tells PostHog, with the person's consent, how the files of this page go
 * (ADR 0029): each one the server took, and each one that stopped in the
 * browser, when sent or in its ingestion, comparing every change with the
 * one before, so that each counts once.
 */
export const useUploadEvents = (
  items: readonly UploadItem[],
  jobs: ReadonlyMap<string, UploadJob>,
) => {
  const previousItems = useRef(items);
  const previousJobs = useRef(jobs);
  useEffect(() => {
    const calls = [
      ...queueEvents(previousItems.current, items),
      ...jobEvents(previousJobs.current, jobs, sentJobIds(items)),
    ];
    previousItems.current = items;
    previousJobs.current = jobs;
    for (const { event, properties } of calls) track(event, properties);
  }, [items, jobs]);
};
