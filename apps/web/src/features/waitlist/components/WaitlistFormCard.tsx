import { cn } from "@/utils/cn.utils";
import { useId } from "react";
import { Card } from "@/components/ui/card";
import { WAITLIST_COPY } from "../waitlist.constants";
import { WaitlistForm } from "./WaitlistForm";

const COPY = WAITLIST_COPY.form;

/** "Entra a la lista de espera": the form's card, the header's anchor (#lista). */
export function WaitlistFormCard({ className }: { className?: string }) {
  const titleId = useId();
  return (
    <section
      id="lista"
      aria-labelledby={titleId}
      className={cn("scroll-mt-6", className)}
    >
      <Card variant="card" className="bg-surface shadow-panel sm:p-7">
        <div className="grid gap-1">
          <h2
            id={titleId}
            className="font-display text-amount-l font-medium text-balance"
          >
            {COPY.title}
          </h2>
          <p className="text-body text-ink-muted">{COPY.detail}</p>
        </div>
        <WaitlistForm />
      </Card>
    </section>
  );
}
