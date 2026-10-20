import { formatQuarter } from "@xtrakto/core";
import { Calendar } from "lucide-react";
import Link from "next/link";
import { accountShortLabel } from "@/utils/account-label.helpers";
import { cn } from "@/utils/cn.utils";
import { quarterOf } from "@/utils/transactions-url.helpers";
import { LinkMenu } from "./LinkMenu";
import { PERIOD_COPY as COPY } from "./period-controls.constants";
import type {
  HrefOf,
  PeriodChoices,
  PeriodOption,
} from "./period-controls.types";
import {
  accountOptions,
  monthOptions,
  quarterOptions,
} from "./period-options.helpers";

// The quarter's months and the whole quarter, as links that keep the
// page's filters in the URL (design-system.md §9, months).
function MonthLinks({ options }: { options: readonly PeriodOption[] }) {
  return (
    <nav
      aria-label={COPY.months}
      className="flex w-full rounded-full bg-surface/80 p-[5px] shadow-chip sm:w-auto"
    >
      {options.map((option) => (
        <Link
          key={option.key}
          href={option.href}
          aria-current={option.isCurrent ? "page" : undefined}
          className={cn(
            "flex min-h-10 flex-1 items-center justify-center rounded-full px-2.5 text-sm whitespace-nowrap sm:flex-none sm:px-4",
            option.isCurrent
              ? "bg-primary-soft font-bold text-primary-strong"
              : "font-semibold text-ink-muted hover:text-ink",
          )}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * The account switch, when there are several, the quarter picker and the
 * months (docs/ui/v8-03), whose links are the page's own (`hrefOf`); they
 * stack at full width on phones.
 */
export function PeriodControls({
  choices,
  hrefOf,
}: {
  choices: PeriodChoices;
  hrefOf: HrefOf;
}) {
  const quarter = formatQuarter(quarterOf(choices.period));
  return (
    <div className="flex flex-wrap items-center gap-3">
      {choices.accounts.length > 1 && (
        <LinkMenu
          label={accountShortLabel(choices.account, choices.account.last4)}
          options={accountOptions(choices, hrefOf)}
        />
      )}
      <LinkMenu
        label={quarter}
        ariaLabel={`${COPY.quarter}: ${quarter}`}
        icon={<Calendar aria-hidden strokeWidth={1.7} />}
        options={quarterOptions(choices, hrefOf)}
      />
      <MonthLinks options={monthOptions(choices, hrefOf)} />
    </div>
  );
}
