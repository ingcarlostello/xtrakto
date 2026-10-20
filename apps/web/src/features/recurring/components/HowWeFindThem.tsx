import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RECURRING_COPY as COPY } from "../recurring.constants";

/** "Cómo los encontramos" (docs/ui/v8-04): what makes a payment fixed. */
export function HowWeFindThem() {
  return (
    <Card
      variant="card"
      className="gap-3"
      role="note"
      aria-labelledby="how-we-find-them"
    >
      <span
        aria-hidden
        className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary"
      >
        <Info strokeWidth={1.9} className="size-5" />
      </span>
      <h2 id="how-we-find-them" className="text-body font-bold">
        {COPY.howTitle}
      </h2>
      <p className="text-caption text-ink-secondary">{COPY.howText}</p>
    </Card>
  );
}
