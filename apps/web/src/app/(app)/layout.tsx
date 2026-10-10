import { AppHeader } from "@/components/layout/AppHeader";
import { NavDock } from "@/components/layout/NavDock";
import { requireSignedIn } from "@/lib/auth";

// The signed-in app: header, page and navigation dock, within the 1360px
// column and the margins of design-system.md §7. On phones the dock is a
// fixed bottom bar, so the page leaves room for it.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireSignedIn();
  return (
    <div className="mx-auto flex w-full max-w-page flex-1 flex-col px-4 pt-7.5 sm:px-7">
      <AppHeader />
      <main className="flex flex-1 flex-col gap-6.5 pt-6.5 pb-32 sm:pb-6.5">
        {children}
      </main>
      <NavDock />
    </div>
  );
}
