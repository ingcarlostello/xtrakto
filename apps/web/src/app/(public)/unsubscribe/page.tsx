import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UNSUBSCRIBE_COPY as COPY } from "@/features/notices/notices.constants";
import {
  WaitlistFooter,
  WaitlistHeader,
} from "@/features/waitlist/components/WaitlistChrome";
import { UNSUBSCRIBE_ROUTES } from "@/lib/auth-routes";

export const metadata: Metadata = {
  title: COPY.metaTitle,
  robots: { index: false },
};

// Public: a notice's link opens it, without a session (ADR 0036). It only
// asks, because mail scanners open every link: the button is what turns the
// notice off. It reads the same whatever the link holds.
export default async function UnsubscribePage({
  searchParams,
}: PageProps<"/unsubscribe">) {
  const { token } = await searchParams;
  const query = new URLSearchParams({
    token: typeof token === "string" ? token : "",
  });
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-4 sm:px-7">
      <WaitlistHeader />
      <main className="grid flex-1 content-start gap-6 py-6">
        <Card variant="card" className="gap-4">
          <h1 className="font-heading text-title font-semibold">
            {COPY.title}
          </h1>
          <p className="text-body text-ink-secondary">{COPY.line}</p>
          <form
            method="post"
            action={`${UNSUBSCRIBE_ROUTES.oneClick}?${query}`}
          >
            <Button type="submit">{COPY.action}</Button>
          </form>
        </Card>
      </main>
      <WaitlistFooter />
    </div>
  );
}
