import type { Metadata } from "next";
import {
  WaitlistBadge,
  WaitlistFooter,
  WaitlistHeader,
} from "@/features/waitlist/components/WaitlistChrome";
import { WaitlistJoined } from "@/features/waitlist/components/WaitlistJoined";
import { WAITLIST_COPY } from "@/features/waitlist/waitlist.constants";

// Where the form leads once someone joins; nothing for search engines.
export const metadata: Metadata = {
  title: WAITLIST_COPY.joined.metaTitle,
  robots: { index: false },
};

export default function WaitlistJoinedPage() {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-4 sm:px-7">
      <WaitlistHeader />
      <main className="grid flex-1 content-start gap-6 py-6">
        <WaitlistBadge />
        <WaitlistJoined />
      </main>
      <WaitlistFooter />
    </div>
  );
}
