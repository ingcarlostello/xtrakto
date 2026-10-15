import type { Metadata } from "next";
import {
  WaitlistBadge,
  WaitlistFooter,
  WaitlistHeader,
} from "@/features/waitlist/components/WaitlistChrome";
import { WaitlistFormCard } from "@/features/waitlist/components/WaitlistFormCard";
import { WAITLIST_COPY } from "@/features/waitlist/waitlist.constants";

// Public: no session (ADR 0021). Phase 16.0c brings the rest of the design.
export const metadata: Metadata = {
  title: WAITLIST_COPY.metaTitle,
  description: WAITLIST_COPY.metaDescription,
};

export default function WaitlistPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-4 sm:px-7">
      <WaitlistHeader />
      <main className="grid flex-1 items-start gap-8 py-6 lg:grid-cols-[1fr_minmax(0,460px)] lg:gap-12 lg:py-10">
        <div className="grid content-start gap-5">
          <WaitlistBadge />
          <h1 className="font-display text-title font-medium text-balance">
            {WAITLIST_COPY.title}
          </h1>
          <p className="text-body text-ink-secondary">
            {WAITLIST_COPY.subtitle}
          </p>
        </div>
        <WaitlistFormCard />
      </main>
      <WaitlistFooter />
    </div>
  );
}
