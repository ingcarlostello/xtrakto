import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import type { NextStepView } from "../next-step.helpers";
import { NEXT_STEP_COPY as COPY } from "../upload-result.constants";

/**
 * What follows the files sent (docs/ui/v8-08, "Lo que sigue"): the
 * movements of their quarter that wait for the quick review, on the
 * attention surface, and the ways on.
 */
export function NextStep({ step }: { step: NextStepView }) {
  return (
    <Card variant="card" aria-labelledby="next-step-title">
      <CardHeader>
        <h2 id="next-step-title" className="text-section font-bold">
          {COPY.title}
        </h2>
      </CardHeader>
      <div className="flex items-start gap-3.5 rounded-md bg-spending-surface p-4">
        <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
          <CircleAlert aria-hidden strokeWidth={1.9} className="size-5" />
          <span className="absolute top-0.5 right-0.5 size-[9px] rounded-full bg-spending" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-bold text-balance">{step.title}</p>
          <p className="text-caption text-ink-secondary">{COPY.text}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button nativeButton={false} render={<Link href={step.reviewHref} />}>
          {COPY.review}
        </Button>
        <Button
          variant="secondary"
          nativeButton={false}
          render={<Link href={step.movementsHref} />}
        >
          {COPY.movements}
        </Button>
      </div>
      <p className="text-caption text-ink-muted">{COPY.moreFiles}</p>
    </Card>
  );
}
