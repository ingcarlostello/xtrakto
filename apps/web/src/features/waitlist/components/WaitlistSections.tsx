import { ShieldCheck } from "lucide-react";
import { type ReactNode, useId } from "react";
import { Card } from "@/components/ui/card";
import { LANDING_COPY } from "../waitlist.constants";
import { PromoVideo } from "./PromoVideo";

const { video, benefits } = LANDING_COPY;

function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="text-center font-display text-landing-section font-semibold text-balance"
    >
      {children}
    </h2>
  );
}

/** "Míralo en un minuto": the promo video, centered. */
export function VideoSection() {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="grid gap-6 py-10">
      <SectionTitle id={titleId}>{video.title}</SectionTitle>
      <div className="mx-auto w-full max-w-[640px]">
        <PromoVideo />
      </div>
    </section>
  );
}

// Each benefit's small visual: the three kinds' dots, the bank's own text,
// the privacy shield (design-system.md §8).
const KIND_DOTS = (
  <span aria-hidden className="flex gap-1.5">
    <span className="size-2.5 rounded-full bg-income" />
    <span className="size-2.5 rounded-full bg-spending" />
    <span className="size-2.5 rounded-full bg-moved" />
  </span>
);
const RAW_TEXT_CHIP = (
  <span className="w-fit rounded-[8px] border border-ring-track bg-surface px-2.5 py-1 font-mono text-meta whitespace-pre text-ink-muted">
    {benefits.movements.sample}
  </span>
);
const PRIVACY_CHIP = (
  <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
    <ShieldCheck className="size-5" strokeWidth={1.9} aria-hidden />
  </span>
);

const BENEFITS = [
  { ...benefits.colors, visual: KIND_DOTS },
  { ...benefits.movements, visual: RAW_TEXT_CHIP },
  { ...benefits.privacy, visual: PRIVACY_CHIP },
];

/** "Lo que vas a poder hacer": what the first version brings, in three cards. */
export function BenefitsSection() {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="grid gap-6 py-10">
      <SectionTitle id={titleId}>{benefits.title}</SectionTitle>
      <ul className="grid gap-4 md:grid-cols-3">
        {BENEFITS.map(({ title, detail, visual }) => (
          <li key={title}>
            <Card variant="card" className="h-full bg-surface">
              {visual}
              <h3 className="font-display text-amount-m font-semibold text-balance">
                {title}
              </h3>
              <p className="text-body text-ink-secondary">{detail}</p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
