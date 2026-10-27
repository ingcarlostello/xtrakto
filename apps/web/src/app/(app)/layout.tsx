import { AppHeader } from "@/components/layout/AppHeader";
import { ClerkRoot } from "@/components/layout/ClerkRoot";
import { NavDock } from "@/components/layout/NavDock";
import { ConsentNotice } from "@/features/analytics/components/ConsentNotice";
import { requireSignedIn } from "@/lib/auth";

// The signed-in app: header, page and navigation dock, within the 1360px
// column and the margins of design-system.md §7. On phones the dock is a
// fixed bottom bar, so the page leaves room for it. The page's content
// takes the focus when the analytics notice above the dock goes.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireSignedIn();
  return (
    <ClerkRoot>
      <div className="mx-auto flex w-full max-w-page flex-1 flex-col px-4 pt-7.5 sm:px-7">
        <AppHeader />
        <main
          tabIndex={-1}
          className="flex flex-1 flex-col gap-6.5 pt-6.5 pb-32 focus-visible:outline-none sm:pb-6.5"
        >
          {children}
        </main>
        <ConsentNotice />
        <NavDock />
      </div>
    </ClerkRoot>
  );
}
