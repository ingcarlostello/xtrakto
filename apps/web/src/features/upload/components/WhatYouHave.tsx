import { Layers } from "lucide-react";
import { CoverageLegend } from "@/components/coverage-timeline/CoverageLegend";
import { CoverageTimeline } from "@/components/coverage-timeline/CoverageTimeline";
import type { CoverageView } from "@/components/coverage-timeline/coverage-timeline.types";
import { StatusPill } from "@/components/status-pill/StatusPill";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import {
  WHAT_YOU_HAVE_COPY as COPY,
  WHAT_YOU_HAVE_TITLE_ID,
} from "../upload-result.constants";

// An account's months: with several accounts, its label and sentence over
// them; then "Encadenado" when its quarters chain, and the timeline, which
// its sentence names.
function AccountMonths({ view }: { view: CoverageView }) {
  return (
    <div className="flex flex-col gap-3">
      {view.accountLabel !== undefined && (
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-bold">{view.accountLabel}</h3>
          <p className="text-caption text-ink-muted">{view.sentence}</p>
        </div>
      )}
      {view.isChained && (
        <StatusPill
          tone="ok"
          title={COPY.chained}
          detail={COPY.chainedDetail}
          className="self-start"
        />
      )}
      <CoverageTimeline segments={view.segments} />
    </div>
  );
}

// The latest month several overlapping movements files brought, per account.
function JoinedNote({ view }: { view: CoverageView }) {
  if (view.note === undefined) return null;
  return (
    <div className="flex items-start gap-3 rounded-md bg-primary-soft-2 p-4">
      <Layers aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
      <p className="text-caption text-ink-secondary">
        {view.accountLabel !== undefined && (
          <strong className="block font-bold">{view.accountLabel}</strong>
        )}
        {view.note}
      </p>
    </div>
  );
}

type WhatYouHaveProps = {
  views: readonly CoverageView[];
  /** The screen shows a file's result: what the user has now (v8-08). */
  isNow: boolean;
};

/**
 * "Lo que tienes" (docs/ui/v8-07): each account's months, as the coverage
 * timeline shows them, with the sentence that says them, the legend, and
 * the month several overlapping movements files brought.
 */
export function WhatYouHave({ views, isNow }: WhatYouHaveProps) {
  const [only] = views.length === 1 ? views : [];
  return (
    <Card variant="card" aria-labelledby={WHAT_YOU_HAVE_TITLE_ID}>
      <CardHeader>
        <h2
          id={WHAT_YOU_HAVE_TITLE_ID}
          tabIndex={-1}
          className="text-section font-bold"
        >
          {isNow ? COPY.titleNow : COPY.title}
        </h2>
        {only && <CardDescription>{only.sentence}</CardDescription>}
      </CardHeader>
      {views.map((view) => (
        <AccountMonths key={view.accountId} view={view} />
      ))}
      <CoverageLegend />
      {views.map((view) => (
        <JoinedNote key={view.accountId} view={view} />
      ))}
    </Card>
  );
}
