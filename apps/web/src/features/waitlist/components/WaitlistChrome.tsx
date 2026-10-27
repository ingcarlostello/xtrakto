import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRIVACY_ROUTE } from "@/lib/auth-routes";
import { LANDING_COPY, WAITLIST_COPY } from "../waitlist.constants";

// The frame the public pages share: the waitlist's two and the privacy page.
// The logo links nowhere: without a session, the app's home only sends
// people to sign in.

/** The logo, and on the landing its way to the form (16.0c). */
export function WaitlistHeader({ action }: { action?: ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-4 py-5">
      <Logo size={32} className="sm:hidden" />
      <Logo size={40} className="hidden sm:inline-flex" />
      {action}
    </header>
  );
}

/** Down to the form's card (#lista); shorter on phones, as the design draws it. */
export function JoinLink() {
  const { full, short } = LANDING_COPY.join;
  return (
    <Button
      variant="secondary"
      size="sm"
      nativeButton={false}
      render={<a href="#lista" />}
    >
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{full}</span>
    </Button>
  );
}

export function WaitlistBadge() {
  return (
    <Badge variant="info" className="h-7 px-3 text-caption font-bold">
      {WAITLIST_COPY.badge}
    </Badge>
  );
}

/** Secondary ink, not muted: the bottom of the background is darker (§3.6). */
export function WaitlistFooter() {
  const { copyright, contact, privacy } = WAITLIST_COPY.footer;
  return (
    <footer className="flex flex-wrap justify-between gap-2 border-t border-chart-axis py-6 text-caption text-ink-secondary">
      <span>{copyright}</span>
      <span className="flex flex-wrap gap-x-4 gap-y-2">
        <span>{contact}</span>
        <Link
          href={PRIVACY_ROUTE}
          className="font-bold text-primary underline-offset-4 hover:underline"
        >
          {privacy}
        </Link>
      </span>
    </footer>
  );
}
