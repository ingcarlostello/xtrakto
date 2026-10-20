import type { TransactionListItem } from "@xtrakto/db";
import { CircleAlert, Tag } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn.utils";
import { TONE_CLASSES } from "@/components/movement-icon/category-icons.constants";
import { movementTone } from "../kind-view.helpers";
import {
  amountText,
  dayBalanceText,
  dayHeading,
  descriptionView,
  groupByDay,
  movementTags,
} from "../transaction-list.helpers";
import {
  MOVEMENT_ROW_ATTRIBUTE,
  movementLinkId,
  TRANSACTIONS_COPY as COPY,
} from "../transaction.constants";
import type {
  DetailLinks,
  MovementMark,
  MovementTags,
  TransactionDay,
  TransactionsHref,
} from "../transaction.types";
import { MovementIcon } from "@/components/movement-icon/MovementIcon";

// The bank's text exactly as printed: its case, its cuts and its double
// spaces (design-system.md §4), wrapping only where it has a space.
const BANK_TEXT = "tracking-[0.02em] break-words whitespace-pre-wrap";

// The link to a movement's detail covers its whole row, and so does its
// focus ring.
const ROW_LINK =
  "after:absolute after:inset-0 after:rounded-md hover:underline focus-visible:outline-none focus-visible:after:outline-[3px] focus-visible:after:outline-offset-[3px] focus-visible:after:outline-primary focus-visible:after:outline-solid";

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
        {day.items.map((item) => (
          <TransactionItem
            key={item.id}
            item={item}
            isCounted={isCounted}
            mark={marks?.get(item.id)}
            links={links}
          />
        ))}
      </ul>
    </div>
  );
}

type MovementDaysProps = Omit<DayGroupProps, "day"> & {
  items: readonly TransactionListItem[];
};

/** Movements by day, newest first, each day with its balance when printed. */
export function MovementDays({ items, ...rest }: MovementDaysProps) {
  return groupByDay(items).map((day) => (
    <DayGroup key={day.date} day={day} {...rest} />
  ));
}
