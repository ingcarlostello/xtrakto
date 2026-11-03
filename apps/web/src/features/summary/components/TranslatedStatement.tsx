import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { FilterChips } from "@/components/filter-chips/FilterChips";
import { TONE_CLASSES } from "@/components/movement-icon/category-icons.constants";
import { MovementIcon } from "@/components/movement-icon/MovementIcon";
import {
  BANK_TEXT,
  ROW_LINK,
} from "@/components/movement-row/movement-row.constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TRANSACTIONS_COPY } from "@/features/transactions/transaction.constants";
import { cn } from "@/utils/cn.utils";
import type { MovementFilter } from "@/utils/transactions-url.helpers";
import { SUMMARY_COPY } from "../summary.constants";
import type {
  AccountSummary,
  TranslatedLineView,
  TranslatedStatementView,
} from "../summary.types";
import { translatedStatementView } from "../translated-statement.helpers";

const COPY = SUMMARY_COPY.translated;
const TAGS = TRANSACTIONS_COPY.tags;

// Its title in plain words, a link to its detail, over the bank's text,
// which screen readers hear after it; the bank's text alone when nothing
// names it.
function LineTitle({ line }: { line: TranslatedLineView }) {
  const bankTextId = `translated-${line.id}-bank`;
  return (
    <div className="col-start-2 row-start-1 flex min-w-0 flex-col gap-0.5">
      <p
        className={cn(
          "text-body",
          line.isBankText ? `font-semibold ${BANK_TEXT}` : "font-bold",
        )}
      >
        <Link
          href={line.href}
          aria-describedby={line.bankText ? bankTextId : undefined}
          className={ROW_LINK}
        >
          {line.title}
        </Link>
      </p>
      {line.bankText && (
        <p id={bankTextId} className={`text-meta text-ink-muted ${BANK_TEXT}`}>
          {line.bankText}
        </p>
      )}
    </div>
  );
}

// What it means, then its channel and "Por revisar" while it's a guess:
// under the title on phones, a column of its own from `md`.
function LineNote({ line }: { line: TranslatedLineView }) {
  return (
    <div className="col-span-2 col-start-2 row-start-2 flex flex-col gap-1.5 pt-1.5 md:col-span-1 md:col-start-3 md:row-start-1 md:pt-0">
      <p className="text-caption text-ink-secondary">{line.note}</p>
      {(line.channel !== undefined || line.isPendingReview) && (
        <div className="flex flex-wrap gap-1.5">
          {line.channel !== undefined && (
            <Badge variant="tag">
              <span className="sr-only">{TAGS.channel} </span>
              {line.channel}
            </Badge>
          )}
          {line.isPendingReview && (
            <Badge variant="review">
              <CircleAlert aria-hidden />
              {TAGS.pendingReview}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// The chip of its category in its kind's tones, and the amount in its
// kind's text color with its sign; neutral and in ink while it's a guess.
function Line({ line }: { line: TranslatedLineView }) {
  return (
    <li className="relative grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-x-3.5 border-t border-divider py-3.5 md:grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1fr)_8rem]">
      <div className="row-span-2 md:row-span-1">
        <MovementIcon categoryId={line.categoryId} tone={line.tone} />
      </div>
      <LineTitle line={line} />
      <LineNote line={line} />
      <p
        className={cn(
          "col-start-3 row-start-1 text-right font-display text-base leading-[1.3] font-medium tabular-nums md:col-start-4",
          TONE_CLASSES[line.tone].amount,
        )}
      >
        {line.amount}
      </p>
    </li>
  );
}

// The title and what the card is, beside the filters from `lg`.
function Header({ filters }: { filters: TranslatedStatementView["filters"] }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
      <div className="flex flex-col gap-0.5">
        <h2 id="translated" className="text-section font-bold">
          {COPY.title}
        </h2>
        <p className="text-caption text-ink-muted">{COPY.subtitle}</p>
      </div>
      <FilterChips label={COPY.filtersLabel} options={filters} />
    </div>
  );
}

// The filter's lines, or that it has none.
function Lines({ lines }: { lines: TranslatedStatementView["lines"] }) {
  if (lines.length === 0)
    return (
      <p className="border-t border-divider pt-3.5 text-caption text-ink-muted">
        {COPY.empty}
      </p>
    );
  return (
    <ul>
      {lines.map((line) => (
        <Line key={line.id} line={line} />
      ))}
    </ul>
  );
}

/**
 * "Tu extracto, traducido" (docs/ui/v8-01, design-system.md §9): the
 * period's main lines, each in plain words over the bank's text with what
 * it means, for the filter in the URL, and the way to their movements.
 */
export function TranslatedStatement({
  summary,
  filter,
}: {
  summary: AccountSummary;
  filter?: MovementFilter;
}) {
  const view = translatedStatementView(summary, filter);
  return (
    <section
      aria-labelledby="translated"
      className="flex flex-col lg:col-start-1"
    >
      <Card variant="card" className="gap-3">
        <Header filters={view.filters} />
        <Lines lines={view.lines} />
        {view.seeAll && (
          <div>
            <Button
              variant="link"
              nativeButton={false}
              render={<Link href={view.seeAll.href} />}
            >
              {view.seeAll.label}
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}
