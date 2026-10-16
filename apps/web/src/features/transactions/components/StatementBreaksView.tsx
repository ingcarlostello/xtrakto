import type { StatementBreaks } from "@xtrakto/db";
import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import {
  breakMarks,
  breaksSummary,
  breaksTitle,
  FIRST_BREAK_ANCHOR,
} from "../balance-breaks.helpers";
import { TRANSACTIONS_COPY } from "../transaction.constants";
import { MovementDays } from "./MovementDays";

const COPY = TRANSACTIONS_COPY.breaks;

// What's off, on the attention surface (v8-13): the closing difference, how
// many rows break the chain, the way to the first one, and uploading again.
function BreaksSummary({ breaks }: { breaks: StatementBreaks }) {
  const count = breaks.statement.breakPositions.length;
  return (
    <Card className="w-full max-w-4xl flex-row items-start gap-4 bg-spending-surface">
      <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-ink">
        <CircleAlert aria-hidden strokeWidth={1.9} className="size-5" />
        <span className="absolute top-0.5 right-0.5 size-[9px] rounded-full bg-spending" />
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="text-section font-bold text-balance">
          {breaksTitle(breaks.statement.differenceMinor)}
        </h2>
        <p className="text-caption text-ink-secondary">
          {COPY.detail} {breaksSummary(count)}
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {count > 0 && (
            <Button
              variant="link"
              nativeButton={false}
              render={<a href={`#${FIRST_BREAK_ANCHOR}`} />}
            >
              {COPY.firstRow}
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            nativeButton={false}
            render={<Link href="/upload" />}
          >
            {COPY.upload}
          </Button>
        </div>
      </div>
    </Card>
  );
}

type ViewProps = { breaks: StatementBreaks; currentYear: string };

/** A statement that doesn't reconcile: what's off, then every row it printed. */
export function StatementBreaksView({ breaks, currentYear }: ViewProps) {
  return (
    <>
      <BreaksSummary breaks={breaks} />
      <Card variant="card" className="w-full max-w-4xl gap-0">
        <CardHeader className="pb-2">
          <h2 className="text-section font-bold text-balance">
            {COPY.listTitle}
          </h2>
          <CardDescription>{COPY.listDetail}</CardDescription>
        </CardHeader>
        <MovementDays
          items={breaks.movements}
          currentYear={currentYear}
          marks={breakMarks(breaks)}
        />
      </Card>
    </>
  );
}
