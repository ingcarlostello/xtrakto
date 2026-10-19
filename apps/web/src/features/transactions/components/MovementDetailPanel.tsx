import { Info, X } from "lucide-react";
import Link from "next/link";
import { RawTextChip } from "@/components/raw-text-chip/RawTextChip";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn.utils";
import { TONE_CLASSES } from "../category-icons.constants";
import {
  DETAIL_CLOSE_ATTRIBUTE,
  movementLinkId,
  TRANSACTIONS_COPY,
} from "../transaction.constants";
import type {
  CorrectionView,
  MovementDetailView,
  OwnRulesView,
  TransactionsHref,
} from "../transaction.types";
import { CorrectionForm } from "./CorrectionForm";
import { MovementIcon } from "./MovementIcon";
import { OwnRules } from "./OwnRules";
import { MovementSheet } from "./MovementSheet";

const COPY = TRANSACTIONS_COPY.detail;

type PanelProps = { view: MovementDetailView; closeHref: TransactionsHref };

// Its category's chip, the bank's text as its title with the day, and the
// way to close it.
function DetailHeading({
  view,
  closeHref,
  titleId,
}: PanelProps & { titleId: string }) {
  return (
    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-start gap-x-3.5">
      <MovementIcon categoryId={view.categoryId} tone={view.tone} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2
          id={titleId}
          tabIndex={-1}
          className="text-section font-bold tracking-[0.02em] break-words whitespace-pre-wrap"
        >
          {view.title}
        </h2>
        <p className="text-caption text-ink-muted">{view.date}</p>
      </div>
      <IconButton
        label={COPY.close}
        nativeButton={false}
        render={
          <Link
            href={closeHref}
            scroll={false}
            {...{ [DETAIL_CLOSE_ATTRIBUTE]: "" }}
          />
        }
      >
        <X aria-hidden />
      </IconButton>
    </div>
  );
}

// Its channel, reference, source and balance after, those it has.
function DetailFacts({ view }: { view: MovementDetailView }) {
  return (
    <dl className="flex flex-col">
      {view.facts.map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-divider py-2.5"
        >
          <dt className="text-meta text-ink-muted">{label}</dt>
          <dd className="text-caption text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// Why it has its category, and the way to the quick review while it's a
// best guess.
function DetailReason({ view }: { view: MovementDetailView }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <p className="flex items-start gap-2 text-caption text-ink-secondary">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>
          <strong className="font-bold">{COPY.why}</strong> {view.reason}
        </span>
      </p>
      {view.reviewHref && (
        <>
          <p className="text-caption text-ink-secondary">{COPY.bestGuess}</p>
          <Button
            variant="link"
            nativeButton={false}
            render={<Link href={view.reviewHref} />}
          >
            {COPY.toReview}
          </Button>
        </>
      )}
    </div>
  );
}

/**
 * A movement's detail (docs/ui/v8-03): its real fields, its Nequi number
 * and the user's rules for it, and its kind and category with why, which
 * the user can change. Beside the list from `lg`, a sheet on phones.
 */
export function MovementDetailPanel({
  view,
  correction,
  own,
  closeHref,
}: PanelProps & { correction: CorrectionView; own: OwnRulesView }) {
  const rowId = movementLinkId(view.id);
  const titleId = `${rowId}-detail`;
  return (
    <MovementSheet titleId={titleId} rowId={rowId}>
      <Card
        variant="card"
        className="gap-5 lg:max-h-[calc(100dvh-9rem)] lg:overflow-y-auto"
      >
        <DetailHeading view={view} closeHref={closeHref} titleId={titleId} />
        <p
          className={cn(
            "font-display text-amount-xl font-medium tabular-nums",
            TONE_CLASSES[view.tone].amount,
          )}
        >
          {view.amount}
        </p>
        <div className="flex flex-col items-start gap-2 rounded-md bg-surface-muted p-4">
          <p className="text-meta font-bold">{COPY.bankText}</p>
          <RawTextChip text={view.bankText} />
        </div>
        <DetailFacts view={view} />
        <OwnRules view={own} />
        <CorrectionForm view={correction} isGuess={view.isGuess}>
          <DetailReason view={view} />
        </CorrectionForm>
      </Card>
    </MovementSheet>
  );
}
