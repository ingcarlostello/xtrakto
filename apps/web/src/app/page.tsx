import { Logo } from "@/components/brand/Logo";

// Placeholder until the app shell (Phase 4.6).
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
      <h1>
        <Logo size={48} />
      </h1>
      <p className="text-sm text-muted-foreground">
        Cuentas claras, mente tranquila
      </p>
    </main>
  );
}
