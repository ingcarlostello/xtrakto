import { Card } from "@/components/ui/card";
import { HOW_IT_WORKS_COPY as COPY } from "../upload.constants";

const STEPS = [COPY.download, COPY.upload] as const;

// Where to get the files and where they go, before the first upload (v8-12).
export function HowItWorks() {
  return (
    <Card variant="card">
      <h2 className="text-section font-bold text-balance">{COPY.title}</h2>
      <ol className="flex flex-col gap-4">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3.5">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-strong"
            >
              {index + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-bold">{step.title}</p>
              <p className="text-caption text-ink-muted">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
