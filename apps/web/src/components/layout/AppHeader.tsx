import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { HEADER_COPY } from "./layout.constants";
import { UserMenu } from "./UserMenu";

// The logo with the tagline on the left; the privacy promise and the avatar
// on the right. No greeting or notifications yet: chat and alerts come later.
export function AppHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <Link
          href="/"
          aria-label={HEADER_COPY.home}
          className="w-fit rounded-sm"
        >
          {/* Mark of 32px on phones, 40px from sm up (docs/brand.md §8). */}
          <Logo size={32} className="sm:hidden" />
          <Logo size={40} className="hidden sm:inline-flex" />
        </Link>
        <p className="text-sm text-ink-muted">{HEADER_COPY.tagline}</p>
      </div>
      <div className="flex items-center gap-5">
        <p className="hidden items-center gap-2 text-body text-ink-secondary sm:flex">
          <ShieldCheck aria-hidden className="size-5" strokeWidth={1.7} />
          {HEADER_COPY.privacy}
        </p>
        <UserMenu />
      </div>
    </header>
  );
}
