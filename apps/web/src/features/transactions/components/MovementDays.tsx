import type { TransactionListItem } from "@xtrakto/db";
import { CircleAlert, Tag } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn.utils";
import { TONE_CLASSES } from "@/components/movement-icon/category-icons.constants";
import {
  BANK_TEXT,
  ROW_LINK,
} from "@/components/movement-row/movement-row.constants";
import { movementTone } from "../kind-view.helpers";
import {
  amountText,
  dayBalanceText,
  dayHeading,
  descriptionView,
  interestNote,
  interestTitle,
  movementTags,
} from "../transaction-list.helpers";
import {
  MOVEMENT_ROW_ATTRIBUTE,
  movementLinkId,
  TRANSACTIONS_COPY as COPY,
} from "../transaction.constants";
import type {
  DetailLinks,
  InterestLine,
  MovementMark,
  MovementTags,
  TransactionDay,
  TransactionsHref,
} from "../transaction.types";
import { MovementIcon } from "@/components/movement-icon/MovementIcon";

type RowLink = {
  readonly id: string;
  readonly href: TransactionsHref;
  readonly isOpen: boolean;
};

function Title({ text, link }: { text: string; link?: RowLink }) {
  if (!link) return text;
  return (
    <Link
      id={link.id}
      href={link.href}
      scroll={false}
      aria-current={link.isOpen ? "true" : undefined}
      className={ROW_LINK}
    >
      {text}
    </Link>
  );
}

function Description({ raw, link }: { raw: string; link?: RowLink }) {
  const view = descriptionView(raw);
  if (view.kind === "bank")
    return (
      <p className={`text-body font-semibold ${BANK_TEXT}`}>
        <Title text={view.text} link={link} />
      </p>
    );
  return (
    <>
      <p className="text-body font-bold">
        <Title text={COPY.noDescription} link={link} />
      </p>
      <p className={`text-meta text-ink-muted ${BANK_TEXT}`}>{view.raw}</p>
    </>
  );
}

// The channel tag, then the category, or "Por revisar" while the category
// is only a guess (design-system.md §9). Screen readers hear what each is.
function MovementTagList({ tags }: { tags: MovementTags }) {
  const { channel, category, isPendingReview } = tags;
  if (channel === undefined && category === undefined && !isPendingReview)
    return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {channel !== undefined && (
        <Badge variant="tag">
          <span className="sr-only">{COPY.tags.channel} </span>
          {channel}
        </Badge>
      )}
      {category !== undefined && (
        <Badge>
          <Tag aria-hidden />
          <span className="sr-only">{COPY.tags.category} </span>
          {category}
        </Badge>
      )}
      {isPendingReview && (
        <Badge variant="review">
          <CircleAlert aria-hidden />
          {COPY.tags.pendingReview}
        </Badge>
      )}
    </div>
  );
}

// Why a row stands out where a statement's balance breaks.
function MarkNote({ note }: { note: string }) {
  return (
    <p className="flex items-start gap-2 pt-1 text-caption text-ink-secondary">
      <span
        aria-hidden
        className="mt-1.5 size-[9px] shrink-0 rounded-full bg-spending"
      />
      {note}
    </p>
  );
}

const rowLinkOf = (id: string, links?: DetailLinks): RowLink | undefined =>
  links && {
    id: movementLinkId(id),
    href: links.open(id),
    isOpen: links.openId === id,
  };

type ItemProps = {
  item: TransactionListItem;
  isCounted: boolean;
  mark?: MovementMark;
  links?: DetailLinks;
};

// The icon of its category in its kind's colors, and its amount in its
// kind's text color with its sign; neutral and in ink while the category is
// a guess or missing (design-system.md §3.4). A marked row, where a
// statement's balance breaks, sits on the attention surface with why; the
// one whose detail is open, on the primary's soft surface.
function TransactionItem({ item, isCounted, mark, links }: ItemProps) {
  const tone = movementTone(item, isCounted);
  const link = rowLinkOf(item.id, links);
  return (
    <li
      {...{ [MOVEMENT_ROW_ATTRIBUTE]: "" }}
      id={mark?.anchor}
      className={cn(
        "relative grid scroll-mt-6 grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-x-3.5 border-t border-divider py-3.5",
        mark && "-mx-3.5 rounded-md border-t-0 bg-spending-surface px-3.5",
        link?.isOpen &&
          "-mx-3.5 rounded-md border-t-0 bg-primary-soft-2 px-3.5 ring-1 ring-primary/40",
      )}
    >
      <MovementIcon categoryId={item.categoryId} tone={tone} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <Description raw={item.descriptionRaw} link={link} />
        <MovementTagList tags={movementTags(item, isCounted)} />
        {mark && <MarkNote note={mark.note} />}
      </div>
      <p
        className={cn(
          "text-right font-display text-base leading-[1.3] font-medium tabular-nums sm:min-w-32",
          TONE_CLASSES[tone].amount,
        )}
      >
        {amountText(item.amountMinor)}
      </p>
    </li>
  );
}

// A month's daily interest in one line (design-system.md §9): its title, the
// bank's text as printed, how many abonos it holds, and what they added up
// to, in income's colors. It opens no detail: it is no single movement.
function InterestItem({ line }: { line: InterestLine }) {
  return (
    <li
      {...{ [MOVEMENT_ROW_ATTRIBUTE]: "" }}
      className="relative grid scroll-mt-6 grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-x-3.5 border-t border-divider py-3.5"
    >
      <MovementIcon categoryId="interest" tone="income" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-body font-bold">{interestTitle(line.date)}</p>
        <p className={`text-meta text-ink-muted ${BANK_TEXT}`}>
          {line.descriptionRaw}
        </p>
        <p className="pt-1 text-caption text-ink-secondary">
          {interestNote(line.count)}
        </p>
      </div>
      <p
        className={cn(
          "text-right font-display text-base leading-[1.3] font-medium tabular-nums sm:min-w-32",
          TONE_CLASSES.income.amount,
        )}
      >
        {amountText(line.amountMinor)}
      </p>
    </li>
  );
}

type DayGroupProps = {
  day: TransactionDay;
  currentYear: string;
  /** False for a statement that doesn't reconcile: its rows count nowhere. */
  isCounted?: boolean;
  marks?: ReadonlyMap<string, MovementMark>;
  /** Where each row opens its detail, in Movimientos. */
  links?: DetailLinks;
};

function DayGroup({
  day,
  currentYear,
  isCounted = true,
  marks,
  links,
}: DayGroupProps) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 pt-4 pb-2">
        <h3 className="text-sm font-bold">
          {dayHeading(day.date, currentYear)}
        </h3>
        {day.balanceMinor !== null && (
          <p className="text-caption text-ink-muted tabular-nums">
            {dayBalanceText(day.balanceMinor)}
          </p>
        )}
      </div>
      <ul>
        {day.lines.map((line) =>
          line.kind === "interest" ? (
            <InterestItem key={`interest-${line.date}`} line={line} />
          ) : (
            <TransactionItem
              key={line.item.id}
              item={line.item}
              isCounted={isCounted}
              mark={marks?.get(line.item.id)}
              links={links}
            />
          ),
        )}
      </ul>
    </div>
  );
}

type MovementDaysProps = Omit<DayGroupProps, "day"> & {
  days: readonly TransactionDay[];
};

/** Lines by day, newest first, each day with its balance when printed. */
export function MovementDays({ days, ...rest }: MovementDaysProps) {
  return days.map((day) => <DayGroup key={day.date} day={day} {...rest} />);
}
