import type { Metadata } from "next";
import { DeleteAccountSection } from "@/features/users/components/DeleteAccountSection";
import { SETTINGS_COPY } from "@/features/users/user.constants";
import { requireSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: SETTINGS_COPY.title };

// The app shell (Phase 4.6) adds the header and the navigation around it.
export default async function SettingsPage() {
  await requireSignedIn();
  return (
    <main className="mx-auto flex w-full max-w-page flex-col gap-6.5 px-4 py-7.5 sm:px-7">
      <header className="flex flex-col gap-0.5">
        <h1 className="font-display text-title font-medium text-balance">
          {SETTINGS_COPY.title}
        </h1>
        <p className="text-sm text-ink-muted">{SETTINGS_COPY.subtitle}</p>
      </header>
      <DeleteAccountSection />
    </main>
  );
}
