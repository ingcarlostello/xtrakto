import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { transactionsHref } from "@/utils/transactions-url.helpers";
import { REVIEW_COPY } from "../review.constants";
import type { Review } from "../review.types";

/** A quarter with nothing left to ask, and the way to its movements. */
export function NothingToReview({
  account,
  period,
}: Pick<Review, "account" | "period">) {
  return (
    <Card variant="card" className="w-full max-w-4xl gap-1.5">
      <h2 className="text-base font-bold text-balance">
        {REVIEW_COPY.nothingTitle}
      </h2>
      <p className="text-caption text-ink-muted">
        {REVIEW_COPY.nothingDescription}
      </p>
      <Button
        variant="link"
        nativeButton={false}
        render={
          <Link href={transactionsHref({ accountId: account.id, period })} />
        }
        className="w-fit"
      >
        {REVIEW_COPY.toMovements}
      </Button>
    </Card>
  );
}
