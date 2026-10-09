import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComponentGallery } from "@/features/design-system/components/ComponentGallery";
import { TokenGallery } from "@/features/design-system/components/TokenGallery";
import { requireSignedIn } from "@/lib/auth";
import { isDevelopment } from "@/lib/env";

export const metadata: Metadata = { title: "Sistema de diseño" };

// Development only: the tokens and base components, to compare with the v7
// screenshots in docs/ui.
export default async function DesignSystemPage() {
  if (!isDevelopment) notFound();
  await requireSignedIn();
  return (
    <main className="mx-auto flex w-full max-w-page flex-col gap-6.5 px-4 py-7.5 sm:px-7">
      <header className="flex flex-col gap-0.5">
        <h1 className="font-display text-title font-medium text-balance">
          Sistema de diseño
        </h1>
        <p className="text-sm text-ink-muted">
          Tokens y componentes base de la v7. Las reglas están en
          .claude/rules/design-system.md.
        </p>
      </header>
      <TokenGallery />
      <ComponentGallery />
    </main>
  );
}
