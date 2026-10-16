import { cn } from "@/utils/cn.utils";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  ONBOARDING_COPY as COPY,
  ONBOARDING_STEP_COUNT,
} from "../onboarding.constants";

const STEPS = Array.from(
  { length: ONBOARDING_STEP_COUNT },
  (_, index) => index + 1,
);

// The logo, the step and "Saltar", which goes where the last step leads: the
// upload screen (v8-15). The bar only repeats the step's number for the eye;
// its empty part sits on the page, where `--ring-track` would vanish.
export function OnboardingHeader({ step }: { step: number }) {
  return (
    <header className="flex flex-col gap-5 pt-7.5">
      <div className="flex items-center justify-between gap-4">
        <Logo size={32} className="sm:hidden" />
        <Logo size={40} className="hidden sm:inline-flex" />
        <div className="flex items-center gap-4">
          <p className="text-caption text-ink-muted">
            {`${COPY.step} ${step} ${COPY.of} ${ONBOARDING_STEP_COUNT}`}
          </p>
          <Button
            variant="link"
            nativeButton={false}
            render={<Link href="/upload" />}
          >
            {COPY.skip}
            <span className="sr-only">{COPY.skipWhat}</span>
          </Button>
        </div>
      </div>
      <div aria-hidden className="flex gap-2 sm:max-w-105">
        {STEPS.map((each) => (
          <span
            key={each}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              each <= step ? "bg-primary" : "bg-chart-axis",
            )}
          />
        ))}
      </div>
    </header>
  );
}
