import type { Metadata } from "next";
import {
  JoinLink,
  WaitlistFooter,
  WaitlistHeader,
} from "@/features/waitlist/components/WaitlistChrome";
import { WaitlistFormCard } from "@/features/waitlist/components/WaitlistFormCard";
import {
  QuarterGlance,
  WaitlistHero,
} from "@/features/waitlist/components/WaitlistHero";
import {
  BenefitsSection,
  VideoSection,
} from "@/features/waitlist/components/WaitlistSections";
import { WAITLIST_COPY } from "@/features/waitlist/waitlist.constants";

// Public: no session (ADR 0021). The human's design: on phones one column in
// the page's order (pitch, form, example, video, benefits); from `lg`, the
// form beside the pitch and its example.
export const metadata: Metadata = {
  title: WAITLIST_COPY.metaTitle,
  description: WAITLIST_COPY.metaDescription,
};

export default function WaitlistPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-4 sm:px-7">
      <WaitlistHeader action={<JoinLink />} />
      <main className="flex-1">
        <div className="grid items-start gap-8 py-6 lg:grid-cols-[1fr_minmax(0,460px)] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:py-10">
          <WaitlistHero className="lg:col-start-1 lg:row-start-1" />
          <WaitlistFormCard className="lg:col-start-2 lg:row-span-2 lg:row-start-1" />
          <QuarterGlance className="lg:col-start-1 lg:row-start-2" />
        </div>
        <VideoSection />
        <BenefitsSection />
      </main>
      <WaitlistFooter />
    </div>
  );
}
