import {
  CURRENCY,
  formatAmount,
  formatDayInWords,
  formatMonthRange,
  type ReportedBalanceCheck,
  sumAmounts,
} from "@xtrakto/core";
import type { BankFigures } from "@xtrakto/db";
import { TODAYS_BALANCE_COPY as BALANCE_COPY } from "@/features/todays-balance/todays-balance.constants";
import { accountLabel } from "@/utils/account-label.helpers";
import { countText, formatCount, wordFor } from "@/utils/count-text.utils";
import { boxAmount, exactSize } from "@/utils/money-text.utils";
import { breaksHref } from "@/utils/transactions-url.helpers";
import { SUMMARY_COPY } from "./summary.constants";
import type { AccountCardView, AccountSummary } from "./summary.types";

const COPY = SUMMARY_COPY.account;

const QUARTERS_A_YEAR = 4;

// A year's interest, added up from its quarterly statements, without an
// average balance: the bank prints one for a quarter only (decided with
// the human, 10.2c).
const yearFiguresOf = (
  bankFigures: readonly BankFigures[],
): AccountCardView["figures"] => {
  const interests = bankFigures.flatMap(({ interestMinor }) =>
    interestMinor === null ? [] : [interestMinor],
  );
  if (interests.length === 0) return [];
  const label =
    bankFigures.length === QUARTERS_A_YEAR
      ? COPY.interestOfYear
      : `${COPY.interestOf} ${countText(bankFigures.length, COPY.quarters)}`;
  return [{ label, value: boxAmount(sumAmounts(interests)) }];
};

// The bank's own figures of the statement the period shows; a month's are
// its quarter's, and say so; a year's, its interest added up.
const figuresOf = ({
  bankFigures,
  period,
}: AccountSummary): AccountCardView["figures"] => {
  if (period.kind === "year") return yearFiguresOf(bankFigures);
  const figures = bankFigures.at(-1);
  if (figures === undefined) return [];
  const { averageBalanceMinor, interestMinor } = figures;
  return [
    ...(averageBalanceMinor === null
      ? []
      : [
          {
            label: COPY.averageBalance[period.kind],
            value: boxAmount(averageBalanceMinor),
          },
        ]),
    ...(interestMinor === null
      ? []
      : [
          {
            label: COPY.interest[period.kind],
            value: boxAmount(interestMinor),
          },
        ]),
  ];
};

type Verified = Pick<BankFigures, "movementCount" | "chainedTo">;

// "312 movimientos cuadran", or "Encadenado con abr–jun 2026 · 312 cuadran".
const verifiedDetail = ({ movementCount, chainedTo }: Verified): string => {
  const reconcile = wordFor(movementCount, COPY.reconcile);
  return chainedTo === null
    ? `${countText(movementCount, COPY.movements)} ${reconcile}`
    : `${COPY.chainedTo} ${formatMonthRange(chainedTo)} · ${formatCount(movementCount)} ${reconcile}`;
};

// What verified a period's balances: its latest quarterly statement, or a
// year's, their movements added up (10.2c).
const verifiedOf = ({
  bankFigures,
  period,
}: AccountSummary): Verified | undefined => {
  if (period.kind !== "year") return bankFigures.at(-1);
  if (bankFigures.length === 0) return undefined;
  const movementCount = bankFigures.reduce(
    (sum, figures) => sum + figures.movementCount,
    0,
  );
  return { movementCount, chainedTo: null };
};

// What a balance typed says of the period (10.3): that it adds up, or by
// how much it's off.
const checkStatus = (check: ReportedBalanceCheck): AccountCardView["status"] =>
  check.status === "adds_up"
    ? {
        tone: "ok",
        title: BALANCE_COPY.addsUp,
        detail: `${BALANCE_COPY.typedOn} ${formatDayInWords(check.reported.date)}`,
      }
    : {
        tone: "attention",
        title: `${BALANCE_COPY.offWithBank} ${exactSize(check.differenceMinor)}`,
        detail: BALANCE_COPY.fileMissing,
      };

// A statement of the period that doesn't reconcile comes first: none of its
// numbers count. Then what a balance typed says of the days after the
// latest verified closing (10.3). Then a verified one, else only files
// without balances.
const statusOf = (summary: AccountSummary): AccountCardView["status"] => {
  const { unreconciled } = summary;
  const [broken] = unreconciled;
  if (broken)
    return {
      tone: "attention",
      title:
        broken.differenceMinor === null || broken.differenceMinor === 0
          ? COPY.doesNotReconcile
          : `${COPY.doesNotReconcile} ${COPY.by} ${exactSize(broken.differenceMinor)}`,
      detail: COPY.checkFile,
    };
  if (summary.balanceCheck) return checkStatus(summary.balanceCheck);
  const verified = verifiedOf(summary);
  return verified
    ? { tone: "ok", title: COPY.verified, detail: verifiedDetail(verified) }
    : { tone: "none", title: COPY.noBalance, detail: COPY.movementsFile };
};

/**
 * "Tu cuenta" (docs/ui/v8-01): the balance at the period's end, when a
 * statement printed it, the account, the bank's own figures, and how its
 * balances check out, with the way to where a statement doesn't reconcile.
 */
export const accountCardView = (summary: AccountSummary): AccountCardView => {
  const [broken] = summary.unreconciled;
  const { balance } = summary;
  return {
    ...(balance
      ? {
          balance: {
            label: `${COPY.balanceOn} ${formatDayInWords(balance.date)}`,
            amount: formatAmount(balance.amountMinor, CURRENCY.COP),
          },
        }
      : {}),
    account: accountLabel(summary.account, summary.account.last4),
    figures: figuresOf(summary),
    status: statusOf(summary),
    ...(broken ? { breaksHref: breaksHref(broken.id) } : {}),
  };
};
