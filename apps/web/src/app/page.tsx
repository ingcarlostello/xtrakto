import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { requireSignedIn } from "@/lib/auth";

// Placeholder until the app shell (Phase 4.6), which moves the user menu and
// the link to the settings to the header.
export default async function Home() {
  await requireSignedIn();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <h1>
        <Logo size={48} />
      </h1>
      <p className="text-sm text-muted-foreground">
        Cuentas claras, mente tranquila
      </p>
      <UserButton />
      <Link
        href="/settings"
        className="text-sm font-bold text-primary hover:underline"
      >
        Configuración
      </Link>
    </main>
  );
}
