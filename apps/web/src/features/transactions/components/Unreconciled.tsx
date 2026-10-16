import type { UnreconciledStatement } from "@xtrakto/db";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { Button } from "@/components/ui/button";
import { breaksHref } from "@/utils/transactions-url.helpers";
import { unreconciledText } from "../balance-breaks.helpers";
import { TRANSACTIONS_COPY } from "../transaction.constants";

const COPY = TRANSACTIONS_COPY.breaks;

/**
 * Above the list, when a statement of its days doesn't reconcile: none of
 * its movements count, and where it breaks is one link away (v8-13).
 */
export function UnreconciledNotice({
  statement,
}: {
  statement: UnreconciledStatement;
}) {
  return (
    <div className="flex w-full max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md bg-spending-surface px-5 py-3">
      <p className="flex items-start gap-2.5 text-caption text-ink-secondary">
        <span
          aria-hidden
          className="mt-1.5 size-[9px] shrink-0 rounded-full bg-spending"
        />
        {unreconciledText(statement)}
      </p>
      <Button
        variant="link"
        nativeButton={false}
        render={<Link href={breaksHref(statement.id)} />}
      >
        {COPY.action}
      </Button>
    </div>
  );
}

/**
 * Instead of "nothing yet" when someone's only statements don't reconcile:
 * the way to the latest one's rows.
 */
export function UnreconciledEmpty({
  statement,
}: {
  statement: UnreconciledStatement;
}) {
  return (
    <EmptyState
      title={COPY.emptyTitle}
      description={COPY.emptyDescription}
      action={
        <Button
          nativeButton={false}
          render={<Link href={breaksHref(statement.id)} />}
        >
          {COPY.action}
        </Button>
      }
    />
  );
}
