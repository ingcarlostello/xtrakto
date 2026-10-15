import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { WAITLIST_COPY } from "../waitlist.constants";

const COPY = WAITLIST_COPY.joined;

/** "Ya estás en la lista", as the design's fourth page draws it. */
export function WaitlistJoined() {
  return (
    <div className="grid gap-6">
      <Card
        variant="card"
        className="items-center bg-surface py-10 text-center"
      >
        <span className="flex size-20 items-center justify-center rounded-full bg-income-soft text-income-on-soft">
          <Check className="size-9" strokeWidth={2.4} aria-hidden />
        </span>
        <h1 className="font-display text-title font-medium text-balance">
          {COPY.title}
        </h1>
        <p className="text-body text-ink-secondary">{COPY.detail}</p>
      </Card>
      <p className="text-center text-body text-ink-secondary">
        {COPY.deletion}
      </p>
    </div>
  );
}
