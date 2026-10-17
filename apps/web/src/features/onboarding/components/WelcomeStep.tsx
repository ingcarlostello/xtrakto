import { ArrowLeftRight, CircleCheck, Layers, List } from "lucide-react";
import Link from "next/link";
import { StatementIllustration } from "@/components/empty-state/StatementIllustration";
import { StatusPill } from "@/components/status-pill/StatusPill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WELCOME_COPY as COPY } from "../onboarding.constants";

const FEATURES = [
  { icon: ArrowLeftRight, ...COPY.features.moved },
  { icon: List, ...COPY.features.days },
  { icon: CircleCheck, ...COPY.features.verified },
  { icon: Layers, ...COPY.features.once },
] as const;

// What works today, each with a neutral chip: no kind colors outside data.
function Features() {
  return (
    <ul className="flex flex-col gap-4">
      {FEATURES.map(({ icon: Icon, title, detail }) => (
        <li key={title} className="flex gap-3.5">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface/80 text-ink shadow-chip"
          >
            <Icon className="size-5" strokeWidth={1.7} />
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-body font-bold">{title}</p>
            <p className="text-caption text-pretty text-ink-muted">{detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// A verified quarter, said to be an example. Its kind rings come back with
// the summary (6.7).
function VerifiedExample() {
  const { example } = COPY;
  return (
    <Card variant="panel" className="gap-5">
      <div className="flex items-center justify-between gap-3">
        <Badge>{example.badge}</Badge>
        <span className="text-caption text-ink-muted">{example.period}</span>
      </div>
      <div className="flex items-center gap-5">
        <StatementIllustration className="w-20 shrink-0 sm:w-24" />
        <div className="flex min-w-0 flex-col gap-3">
          <StatusPill
            tone="ok"
            title={example.verified}
            detail={example.verifiedDetail}
          />
          <p className="text-caption text-pretty text-ink-muted">
            {example.note}
          </p>
        </div>
      </div>
    </Card>
  );
}

/** docs/ui/v8-15: what Xtrakto does, then "Empezar"; the example beside it. */
export function WelcomeStep() {
  return (
    <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-7.5">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-title font-semibold text-balance sm:text-landing">
            {COPY.title}
          </h1>
          <p className="text-body text-pretty text-ink-secondary sm:text-lg">
            {COPY.subtitle}
          </p>
        </div>
        <Features />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button
            nativeButton={false}
            render={<Link href="/onboarding/first-file" />}
          >
            {COPY.start}
          </Button>
          <p className="text-caption text-ink-muted">{COPY.startNote}</p>
        </div>
      </div>
      <VerifiedExample />
    </div>
  );
}
