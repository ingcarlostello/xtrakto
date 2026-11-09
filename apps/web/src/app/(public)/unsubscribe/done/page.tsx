import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UNSUBSCRIBE_COPY } from "@/features/notices/notices.constants";
import {
  WaitlistFooter,
  WaitlistHeader,
} from "@/features/waitlist/components/WaitlistChrome";

const COPY = UNSUBSCRIBE_COPY.done;

export const metadata: Metadata = {
  title: COPY.metaTitle,
  robots: { index: false },
};

// Where the button leads, whatever its link held.
export default function UnsubscribedPage() {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-4 sm:px-7">
      <WaitlistHeader />
      <main className="grid flex-1 content-start gap-6 py-6">
        <Card variant="card" className="gap-4">
          <h1 className="font-heading text-title font-semibold">
            {COPY.title}
          </h1>
          <p className="text-body text-ink-secondary">{COPY.line}</p>
          <Button
            variant="secondary"
            render={<Link href="/profile" />}
            nativeButton={false}
          >
            {COPY.action}
          </Button>
        </Card>
      </main>
      <WaitlistFooter />
    </div>
  );
}
