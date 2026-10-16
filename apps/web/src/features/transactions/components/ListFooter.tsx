"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useFocusNewMovements } from "../hooks/use-focus-new-movements";
import type { NextStep } from "../transaction.types";

type ListFooterProps = {
  readonly shown: number;
  /** `"Mostrando 30 de 312"`. */
  readonly status: string;
  readonly next: NextStep | undefined;
};

// How many show, and "Mostrar 30 más". The count lives in the URL with the
// other filters, so a reload keeps it; the page stays where it was.
export function ListFooter({ shown, status, next }: ListFooterProps) {
  const { footerRef, markLoading } = useFocusNewMovements(shown);
  return (
    <div
      ref={footerRef}
      className="flex flex-wrap items-center justify-between gap-x-4 border-t border-divider pt-1"
    >
      <p className="text-meta text-ink-muted">{status}</p>
      {next && (
        <Button
          variant="link"
          nativeButton={false}
          render={
            <Link href={next.href} scroll={false} onClick={markLoading} />
          }
        >
          {next.label}
        </Button>
      )}
    </div>
  );
}
