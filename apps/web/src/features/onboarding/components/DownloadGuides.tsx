import { FileSpreadsheet, List } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DOWNLOAD_COPY as COPY, FIRST_FILE } from "../onboarding.constants";
import type { FirstFile } from "../onboarding.schemas";

type GuideStep = { readonly title: string; readonly detail?: string };

type GuideProps = {
  icon: LucideIcon;
  title: string;
  steps: readonly GuideStep[];
};

const QUARTERLY = { icon: FileSpreadsheet, ...COPY.quarterly };
const MOVEMENTS = { icon: List, ...COPY.movements };

// The bank's own path to one file, step by step.
function Guide({ icon: Icon, title, steps }: GuideProps) {
  return (
    <section className="flex flex-col gap-3.5 rounded-md bg-surface-muted p-4 sm:p-5">
      <h2 className="flex items-center gap-2.5 text-body font-bold">
        <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.7} />
        {title}
      </h2>
      <ol className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-meta font-bold text-primary-strong"
            >
              {index + 1}
            </span>
            <div className="flex flex-col gap-0.5 pt-0.5">
              <p className="text-sm font-bold">{step.title}</p>
              {step.detail && (
                <p className="text-caption text-ink-muted">{step.detail}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** docs/ui/v8-17: where to get each file, the one chosen first on top. */
export function DownloadGuides({ first }: { first: FirstFile }) {
  const guides =
    first === FIRST_FILE.MOVEMENTS
      ? [MOVEMENTS, QUARTERLY]
      : [QUARTERLY, MOVEMENTS];
  return (
    <Card variant="card" className="gap-5 sm:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-title font-medium text-balance">
          {COPY.title}
        </h1>
        <p className="text-body text-pretty text-ink-muted">
          {COPY.subtitle[first]}
        </p>
      </div>
      {guides.map((guide) => (
        <Guide key={guide.title} {...guide} />
      ))}
    </Card>
  );
}
