import {
  type AmountMinor,
  CURRENCY,
  formatAmount,
  formatDayInWords,
  formatMonthRange,
  isAmountMinor,
} from "@xtrakto/core";
import type { BankFigures } from "@xtrakto/db";
import { accountLabel } from "@/utils/account-label.helpers";
import { countText, formatCount, wordFor } from "@/utils/count-text.utils";
import { compactSize } from "@/utils/money-text.utils";
import { breaksHref } from "@/utils/transactions-url.helpers";
import { SUMMARY_COPY } from "./summary.constants";
import type { AccountCardView, AccountSummary } from "./summary.types";

const COPY = SUMMARY_COPY.account;
// A box writes a million or more compact, "$10,4M", and less exact, "$1.320".
const COMPACT_FROM_MINOR = 100_000_000;

// Some money without its direction, to the peso: "$810".
const exact = (amount: AmountMinor): string => {
  const size = Math.abs(amount);
  return formatAmount(isAmountMinor(size) ? size : amount, CURRENCY.COP);
};

const boxAmount = (amount: AmountMinor): string =>
  Math.abs(amount) >= COMPACT_FROM_MINOR ? compactSize(amount) : exact(amount);

// The bank's own figures of the statement the period shows; a month's are
// its quarter's, and say so.
const figuresOf = ({
  bankFigures,
  period,
}: AccountSummary): AccountCardView["figures"] => {
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

// "312 movimientos cuadran", or "Encadenado con abr–jun 2026 · 312 cuadran".
const verifiedDetail = ({ movementCount, chainedTo }: BankFigures): string => {
  const reconcile = wordFor(movementCount, COPY.reconcile);
  return chainedTo === null
    ? `${countText(movementCount, COPY.movements)} ${reconcile}`
    : `${COPY.chainedTo} ${formatMonthRange(chainedTo)} · ${formatCount(movementCount)} ${reconcile}`;
};

// A statement of the period that doesn't reconcile comes first: none of its
// numbers count. Then a verified one, else only files without balances.
const statusOf = ({
  unreconciled,
  bankFigures,
}: AccountSummary): AccountCardView["status"] => {
  const [broken] = unreconciled;
  if (broken)
    return {
      tone: "attention",
      title:
        broken.differenceMinor === null || broken.differenceMinor === 0
          ? COPY.doesNotReconcile
          : `${COPY.doesNotReconcile} ${COPY.by} ${exact(broken.differenceMinor)}`,
      detail: COPY.checkFile,
    };
  const verified = bankFigures.at(-1);
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
