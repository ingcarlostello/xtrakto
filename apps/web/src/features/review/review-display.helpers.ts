import { categoryKind, NO_DESCRIPTION } from "@xtrakto/core";
import type { StatusTone } from "@/components/status-pill/StatusPill";
import { countText, type Noun } from "@/utils/count-text.utils";
import { REVIEW_COPY as COPY } from "./review.constants";
import type {
  GroupMovements,
  PendingReview,
  ReviewGroup,
  ReviewOutcome,
} from "./review.types";

/** The bank's texts an answered group's name quotes before "y N más". */
const QUOTED_TEXTS = 2;
/** About what answering a group takes (docs/ui/v8-02: 4 groups, 2 minutes). */
const SECONDS_PER_GROUP = 30;

const wordFor = (count: number, { one, other }: Noun): string =>
  count === 1 ? one : other;

// "“A”", "“A” y “B”", "“A”, “B” y 3 más".
const listOf = (items: readonly string[], more: number): string => {
  const all = more > 0 ? [...items, `${more} ${COPY.moreTexts}`] : [...items];
  const last = all.pop();
  return all.length === 0 ? `${last}` : `${all.join(", ")} y ${last}`;
};

/**
 * An answered group's name with the bank's texts it answered, as printed:
 * `Transferencias a tu nombre (“TRANSF A ANA LUCIA MAR” y “Ana Lucia Mar”)`.
 * The bank's `0` names nothing, so it isn't quoted.
 */
export const answeredTitle = (
  name: string,
  { texts }: GroupMovements,
): string => {
  const quoted = texts.flatMap(({ text }) =>
    text.trim() === NO_DESCRIPTION ? [] : [`“${text}”`],
  );
  if (quoted.length === 0) return name;
  const shown = quoted.slice(0, QUOTED_TEXTS);
  return `${name} (${listOf(shown, quoted.length - shown.length)})`;
};

/**
 * What some answered movements count as now, in the kinds' words: "Son
 * tuyas: 5 movimientos cuentan como movido.", and for "No sé" that the best
 * guess stands. A category the table no longer has names no kind.
 */
export const outcomeText = ({
  said,
  categoryId,
  isGuessKept,
  count,
}: ReviewOutcome): string => {
  const movements = countText(count, COPY.movements);
  const kindOf = categoryKind(categoryId);
  if (kindOf === undefined) return `${said}: ${movements}.`;
  const kind = COPY.kinds[kindOf];
  return isGuessKept
    ? `${said}: ${movements} ${wordFor(count, COPY.stays)} ${kind}, ${COPY.guessKept}.`
    : `${said}: ${movements} ${wordFor(count, COPY.counts)} ${kind}.`;
};

/** What waits for an answer: the open groups and their movements. */
export const pendingOf = (groups: readonly ReviewGroup[]): PendingReview => ({
  groups: groups.filter(({ pending }) => pending !== null).length,
  movements: groups.reduce(
    (sum, { pending }) => sum + (pending?.count ?? 0),
    0,
  ),
});

// "Menos de un minuto", "Un minuto", "Unos 2 minutos".
const timeToAnswer = (openGroups: number): string => {
  const seconds = openGroups * SECONDS_PER_GROUP;
  if (seconds < 60) return COPY.underAMinute;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1
    ? COPY.aMinute
    : `${COPY.aboutMinutes.before} ${minutes} ${COPY.aboutMinutes.after}`;
};

export type ReviewStatus = {
  readonly tone: StatusTone;
  readonly title: string;
  readonly detail: string;
};

/**
 * The status beside the review's title: every group of the quarter and its
 * movements, answered or not ("6 grupos · 38 movimientos"), then about how
 * long the open ones take, or that everything is answered.
 */
export const reviewStatus = (groups: readonly ReviewGroup[]): ReviewStatus => {
  const open = pendingOf(groups).groups;
  const movements = groups.reduce(
    (sum, { pending, answered }) =>
      sum + (pending?.count ?? 0) + (answered?.count ?? 0),
    0,
  );
  return {
    tone: open > 0 ? "info" : "ok",
    title: `${countText(groups.length, COPY.groups)} · ${countText(movements, COPY.movements)}`,
    detail: open > 0 ? timeToAnswer(open) : COPY.allAnswered,
  };
};

/** "Tienes 4 grupos por revisar (24 movimientos)". */
export const bannerTitle = ({ groups, movements }: PendingReview): string =>
  `${COPY.bannerYouHave} ${countText(groups, COPY.groups)} ${COPY.bannerToReview} (${countText(movements, COPY.movements)})`;
