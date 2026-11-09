import {
  addDaysTo,
  type AmountMinor,
  CURRENCY,
  formatAmount,
  formatDayInWords,
  type LocalDate,
  type Period,
  type ReportedBalanceCheck,
} from "@xtrakto/core";
import type { StatusTone } from "@/components/status-pill/StatusPill";
import { exactSize } from "@/utils/money-text.utils";
import { TODAYS_BALANCE_COPY as COPY } from "./todays-balance.constants";
import type { TodaysBalanceAnswer } from "./todays-balance.types";

/** A movements file reaches today when its last movement is of today or yesterday. */
export const reachesToday = (lastDay: LocalDate, today: LocalDate): boolean =>
  lastDay >= addDaysTo(today, -1);

/** What a check came to, as the field answers it. */
export const answerOf = (check: ReportedBalanceCheck): TodaysBalanceAnswer =>
  check.status === "adds_up"
    ? { status: "adds_up", ...check.reported }
    : { status: "off", differenceMinor: check.differenceMinor };

type AnswerPill = {
  readonly tone: StatusTone;
  readonly title: string;
  readonly detail: string;
};

/** The answer in a status pill: "Cuadra con tu banco" or "No cuadra por $12.400". */
export const answerPill = (answer: TodaysBalanceAnswer): AnswerPill =>
  answer.status === "adds_up"
    ? {
        tone: "ok",
        title: COPY.addsUp,
        detail: `${formatAmount(answer.amountMinor, CURRENCY.COP)} ${COPY.on} ${formatDayInWords(answer.date)}`,
      }
    : {
        tone: "attention",
        title: `${COPY.offBy} ${exactSize(answer.differenceMinor)}`,
        detail: COPY.fileMissing,
      };

/** The check, when the days it speaks about meet the period's. */
export const checkInPeriod = (
  check: ReportedBalanceCheck | undefined,
  { from, to }: Period,
): ReportedBalanceCheck | undefined =>
  check && check.closingDate < to && from <= check.reported.date
    ? check
    : undefined;

/** Each day a check that added up worked out, with its closing balance. */
export const checkedDayBalances = (
  check: ReportedBalanceCheck | undefined,
): ReadonlyMap<LocalDate, AmountMinor> =>
  new Map(
    check?.status === "adds_up"
      ? check.days.map(({ date, closingMinor }) => [date, closingMinor])
      : [],
  );

/** "Desde el 1 de octubre, el saldo es calculado y cuadra con el de tu banco." */
export const checkedNote = (
  check: ReportedBalanceCheck | undefined,
): string | undefined =>
  check?.status === "adds_up"
    ? `${COPY.checkedFrom} ${formatDayInWords(addDaysTo(check.closingDate, 1))}, ${COPY.checkedNote}`
    : undefined;
