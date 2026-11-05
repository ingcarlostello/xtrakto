import {
  formatMonthName,
  formatQuarter,
  formatShortMonth,
} from "@xtrakto/core";
import { accountLabel } from "@/utils/account-label.helpers";
import {
  type MovementPeriod,
  type PagePeriod,
  periodParam,
  quarterOf,
  type YearPeriod,
} from "@/utils/transactions-url.helpers";
import { isSameQuarter } from "./period-choices.helpers";
import { PERIOD_COPY as COPY } from "./period-controls.constants";
import type {
  HrefOf,
  PagePeriodChoices,
  PeriodChoices,
  PeriodLink,
  PeriodOption,
} from "./period-controls.types";

/** What the controls choose among: a page's, with years when it offers them (10.2b). */
export type AnyPeriodChoices = PeriodChoices | PagePeriodChoices;

const QUARTER_BADGES = {
  verified: { label: COPY.verified, variant: "ok" },
  unverified: { label: COPY.unverified, variant: "neutral" },
  unreconciled: { label: COPY.unreconciled, variant: "attention" },
} as const;

// Links keep the account only when there are several.
const accountOf = ({ accounts, account }: AnyPeriodChoices) =>
  accounts.length > 1 ? account.id : undefined;

/** A link to the account and period a page shows, the account only when there are several. */
export const periodLinkOf = (choices: AnyPeriodChoices): PeriodLink => {
  const accountId = accountOf(choices);
  return {
    ...(accountId === undefined ? {} : { accountId }),
    period: choices.period,
  };
};

/** The quarters to choose from, each with its status. */
export const quarterOptions = (
  choices: AnyPeriodChoices,
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

/**
 * The years to choose from, after the quarters (10.2b): "Año 2026", with
 * how many of its months the account has. None where the page offers none.
 */
export const yearOptions = (
  choices: AnyPeriodChoices,
  hrefOf: HrefOf,
): readonly PeriodOption[] => {
  if (!("years" in choices)) return [];
  const { period } = choices;
  return choices.years.map(({ year, months }) => {
    const option: YearPeriod = { kind: "year", year };
    return {
      key: periodParam(option),
      label: `${COPY.year} ${year}`,
      href: hrefOf({ accountId: accountOf(choices), period: option }),
      isCurrent: period.kind === "year" && period.year === year,
      badge: { label: `${months} ${COPY.ofTwelveMonths}`, variant: "info" },
    };
  });
};

const capitalized = (text: string): string =>
  `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

// A quarter by its months, in a year's row: "Jul–sep".
const quarterMonths = ({ year, quarter }: { year: number; quarter: number }) =>
  `${capitalized(formatShortMonth({ year, month: quarter * 3 - 2 }))}–${formatShortMonth({ year, month: quarter * 3 })}`;

// A year's quarters with movements, in order, then the whole year (10.2b).
const yearRow = (
  choices: AnyPeriodChoices,
  { year }: YearPeriod,
): PagePeriod[] => [
  ...choices.quarters
    .filter((quarter) => quarter.year === year)
    .sort((a, b) => a.quarter - b.quarter)
    .map(({ quarter }): PagePeriod => ({ kind: "quarter", year, quarter })),
  { kind: "year", year },
];

/** What the row under the picker names: a quarter's months, or a year's quarters. */
export const rowLabel = ({ period }: AnyPeriodChoices): string =>
  period.kind === "year" ? COPY.quarters : COPY.months;

/**
 * The shown quarter's three months, then the whole quarter; or, under a
 * year, its quarters with movements, then the whole year (10.2b).
 */
export const monthOptions = (
  choices: AnyPeriodChoices,
  hrefOf: HrefOf,
): readonly PeriodOption[] => {
  const shown = choices.period;
  if (shown.kind === "year")
    return yearRow(choices, shown).map((option) => ({
      key: periodParam(option),
      label: option.kind === "quarter" ? quarterMonths(option) : COPY.year,
      href: hrefOf({ accountId: accountOf(choices), period: option }),
      isCurrent: periodParam(option) === periodParam(shown),
    }));
  const { year, quarter } = quarterOf(shown);
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

/** The quarter picker's label, and its name: a quarter's, or the year's. */
export const pickerLabel = (
  period: PagePeriod,
): { readonly label: string; readonly ariaLabel: string } => {
  if (period.kind === "year") {
    const label = `${COPY.year} ${period.year}`;
    return { label, ariaLabel: `${COPY.period}: ${label}` };
  }
  const label = formatQuarter(quarterOf(period));
  return { label, ariaLabel: `${COPY.quarter}: ${label}` };
};

/** The accounts to switch to, each opening on its latest quarter. */
export const accountOptions = (
  { accounts, account }: AnyPeriodChoices,
  hrefOf: HrefOf,
): readonly PeriodOption[] =>
  accounts.map((option) => ({
    key: option.id,
    label: accountLabel(option, option.last4),
    href: hrefOf({ accountId: option.id }),
    isCurrent: option.id === account.id,
  }));
