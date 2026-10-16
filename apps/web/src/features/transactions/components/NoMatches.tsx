import { Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { transactionsHref } from "@/utils/transactions-url.helpers";
import type { ListLink } from "../transaction-list.helpers";
import { TRANSACTIONS_COPY } from "../transaction.constants";

const COPY = TRANSACTIONS_COPY.search;

/** "No encontramos “netflix”" (docs/ui/v8-13), with the way back to every movement. */
export function NoMatches({ link }: { link: ListLink }) {
  const { search, ...withoutSearch } = link;
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 py-8 text-center"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-ink">
        <Search aria-hidden strokeWidth={1.9} className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-body font-bold text-balance">
          {COPY.noMatches} “{search}”
        </p>
        <p className="text-caption text-ink-muted">{COPY.noMatchesDetail}</p>
      </div>
      <Button
        variant="secondary"
        size="sm"
        nativeButton={false}
        render={<Link href={transactionsHref(withoutSearch)} scroll={false} />}
      >
        {COPY.clear}
      </Button>
    </div>
  );
}
