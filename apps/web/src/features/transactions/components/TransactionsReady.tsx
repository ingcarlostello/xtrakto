import { List } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { Button } from "@/components/ui/button";
import { countText } from "@/utils/count-text.utils";
import { TRANSACTIONS_COPY as COPY } from "../transaction.constants";

/**
 * The summary once movements count, until Phase 6.7 builds it: how many
 * there are, and the way to them.
 */
export function TransactionsReady({ count }: { count: number }) {
  return (
    <EmptyState
      title={`${COPY.ready.title} ${countText(count, COPY.movements)}`}
      description={COPY.ready.description}
      action={
        <Button nativeButton={false} render={<Link href="/transactions" />}>
          <List aria-hidden strokeWidth={2.2} />
          {COPY.ready.action}
        </Button>
      }
    />
  );
}
