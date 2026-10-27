import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { PrivacySectionView } from "@/features/privacy/components/PrivacySectionView";
import { PRIVACY_COPY } from "@/features/privacy/privacy.constants";
import {
  WaitlistFooter,
  WaitlistHeader,
} from "@/features/waitlist/components/WaitlistChrome";

// Public: no session (7.5). Google's consent screen links it, and a
// waitlist-only deployment serves it beside the waitlist, in the waitlist's
// frame. One column of reading width, the sections on one card.
export const metadata: Metadata = {
  title: PRIVACY_COPY.metaTitle,
  description: PRIVACY_COPY.metaDescription,
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-4 sm:px-7">
      <WaitlistHeader />
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-6 py-6 lg:py-10">
        <header className="flex flex-col gap-2">
          <h1 className="font-heading text-title font-semibold">
            {PRIVACY_COPY.title}
          </h1>
          <p className="text-body text-ink-secondary">{PRIVACY_COPY.intro}</p>
          <p className="text-caption text-ink-muted">
            {PRIVACY_COPY.effective}
          </p>
        </header>
        <Card variant="card" className="gap-8">
          {PRIVACY_COPY.sections.map((section) => (
            <PrivacySectionView key={section.id} section={section} />
          ))}
        </Card>
      </main>
      <WaitlistFooter />
    </div>
  );
}
