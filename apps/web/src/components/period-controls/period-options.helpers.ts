import { formatMonthName, formatQuarter } from "@xtrakto/core";
import { accountLabel } from "@/utils/account-label.helpers";
import {
  type MovementPeriod,
  periodParam,
  quarterOf,
} from "@/utils/transactions-url.helpers";
import { isSameQuarter } from "./period-choices.helpers";
import { PERIOD_COPY as COPY } from "./period-controls.constants";
import type {
  HrefOf,
  PeriodChoices,
  PeriodOption,
} from "./period-controls.types";

const QUARTER_BADGES = {
  verified: { label: COPY.verified, variant: "ok" },
  unverified: { label: COPY.unverified, variant: "neutral" },
  unreconciled: { label: COPY.unreconciled, variant: "attention" },
} as const;

// Links keep the account only when there are several.
const accountOf = ({ accounts, account }: PeriodChoices) =>
  accounts.length > 1 ? account.id : undefined;

/** The quarters to choose from, each with its status. */
export const quarterOptions = (
  choices: PeriodChoices,
  hrefOf: HrefOf,
): readonly PeriodOption[] =>
  choices.quarters.map((quarter) => {
    const period: MovementPeriod = {
      kind: "quarter",
      year: quarter.year,
      quarter: quarter.quarter,
    };
    return {
      key: periodParam(period),
      label: formatQuarter(quarter),
      href: hrefOf({ accountId: accountOf(choices), period }),
      isCurrent: isSameQuarter(choices.period, quarter),
      badge: QUARTER_BADGES[quarter.status],
    };
  });

/** The shown quarter's three months, then the whole quarter. */
export const monthOptions = (
  choices: PeriodChoices,
  hrefOf: HrefOf,
): readonly PeriodOption[] => {
  const { year, quarter } = quarterOf(choices.period);
  const months: MovementPeriod[] = [0, 1, 2].map((offset) => ({
    kind: "month",
    year,
    month: quarter * 3 - 2 + offset,
  }));
  const options: MovementPeriod[] = [
    ...months,
    { kind: "quarter", year, quarter },
  ];
  return options.map((option) => ({
    key: periodParam(option),
    label: option.kind === "month" ? formatMonthName(option) : COPY.quarter,
    href: hrefOf({ accountId: accountOf(choices), period: option }),
    isCurrent: periodParam(option) === periodParam(choices.period),
  }));
};

/** The accounts to switch to, each opening on its latest quarter. */
export const accountOptions = (
  { accounts, account }: PeriodChoices,
  hrefOf: HrefOf,
): readonly PeriodOption[] =>
  accounts.map((option) => ({
    key: option.id,
    label: accountLabel(option, option.last4),
    href: hrefOf({ accountId: option.id }),
    isCurrent: option.id === account.id,
  }));
