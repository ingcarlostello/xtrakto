import { type CalendarMonth, formatMonthName } from "@xtrakto/core";
import { filesFor } from "@/components/coverage-timeline/coverage-gaps.helpers";
import {
  monthAtIndex,
  monthIndex,
} from "@/components/coverage-timeline/coverage-timeline.helpers";
import { PAGE_COPY } from "@/components/empty-state/empty-states.constants";
import { filesText } from "@/features/summary/missing-months.helpers";
import { SITE_URL } from "@/lib/site";
import { summaryHref } from "@/utils/transactions-url.helpers";
import type { MonthlyStatus } from "./monthly-summary.helpers";
import {
  appUrlOf,
  type EmailSection,
  noticeEmail,
} from "./notice-email.helpers";
import {
  MONTHLY_EMAIL_COPY as COPY,
  UPLOAD_EMAIL_COPY,
} from "./notices.constants";

const UPLOAD_URL = `${SITE_URL}/upload`;

const nameOf = (month: CalendarMonth): string =>
  formatMonthName(month).toLocaleLowerCase("es-CO");

/** What the email says of the month: its status, and whether an account is another bank's (11.3c). */
export type MonthlyFacts = {
  readonly status: MonthlyStatus;
  readonly hasOtherBank: boolean;
};

// The file that brings the month, as the summary's notice names it (10.2d),
// seen from the month after it: its quarterly statement once its quarter
// ended, else its movements. With an account of another bank, whose name an
// email never carries, its movements, which every bank gives (11.3c).
const fileWords = (month: CalendarMonth, hasOtherBank: boolean): string => {
  if (hasOtherBank) return `${COPY.yourMovements} ${nameOf(month)}`;
  const today = monthAtIndex(monthIndex(month) + 1);
  return filesText(filesFor([month], today), today.year);
};

const sectionOf = (
  { status, hasOtherBank }: MonthlyFacts,
  month: CalendarMonth,
): EmailSection => {
  const name = nameOf(month);
  if (status.kind === "ready")
    return {
      title: `${COPY.ready.title} ${name} ${COPY.ready.isReady}`,
      lines: [COPY.ready.line],
      action: COPY.ready.action,
      url: appUrlOf(
        summaryHref({
          accountId: status.accountId,
          period: { kind: "month", ...month },
        }),
      ),
    };
  const { title, toSee } = COPY[status.kind];
  return {
    title: `${title} ${name}`,
    lines: [`${toSee} ${fileWords(month, hasOtherBank)}.`],
    action: PAGE_COPY.uploadAction,
    url: UPLOAD_URL,
  };
};

/** The email of the first of the month: its summary, or which file it needs. */
export const monthlySummaryEmail = (
  facts: MonthlyFacts,
  month: CalendarMonth,
  unsubscribeUrl: string,
) =>
  noticeEmail({
    sections: [sectionOf(facts, month)],
    footer: COPY.footer,
    unsubscribe: UPLOAD_EMAIL_COPY.unsubscribe.one,
    unsubscribeUrl,
  });
