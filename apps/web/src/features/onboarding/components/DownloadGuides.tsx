import { CreditCard, FileSpreadsheet, Globe, List } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DOWNLOAD_COPY as COPY } from "../onboarding.constants";
import { downloadContentOf, GUIDE, type GuideKey } from "../onboarding.helpers";
import type { FirstBank, FirstFile } from "../onboarding.schemas";

type GuideStep = { readonly title: string; readonly detail?: string };

type GuideProps = {
  icon: LucideIcon;
  title: string;
  steps: readonly GuideStep[];
};

const GUIDES: Readonly<Record<GuideKey, GuideProps>> = {
  [GUIDE.QUARTERLY]: { icon: FileSpreadsheet, ...COPY.quarterly },
  [GUIDE.MOVEMENTS]: { icon: List, ...COPY.movements },
  [GUIDE.CARD]: { icon: CreditCard, ...COPY.card },
  [GUIDE.NU_CARD]: { icon: CreditCard, ...COPY.nu.guide },
  [GUIDE.OTHER_BANK]: { icon: Globe, ...COPY.otherBank.guide },
};

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

/**
 * docs/ui/v8-17: where to get each file, the one chosen first on top; Nu's
 * card's (12.3b); or, for another bank, what to download from it.
 */
export function DownloadGuides({
  first,
  bank,
}: {
  first: FirstFile;
  bank: FirstBank;
}) {
  const { title, subtitle, guides } = downloadContentOf(first, bank);
  return (
    <Card variant="card" className="gap-5 sm:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-title font-medium text-balance">
          {title}
        </h1>
        <p className="text-body text-pretty text-ink-muted">{subtitle}</p>
      </div>
      {guides.map((key) => (
        <Guide key={key} {...GUIDES[key]} />
      ))}
    </Card>
  );
}
