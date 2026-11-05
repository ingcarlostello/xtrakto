import { Calendar } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { accountShortLabel } from "@/utils/account-label.helpers";
import { cn } from "@/utils/cn.utils";
import { LinkMenu } from "./LinkMenu";
import type { HrefOf, PeriodOption } from "./period-controls.types";
import {
  accountOptions,
  type AnyPeriodChoices,
  monthOptions,
  pickerLabel,
  quarterOptions,
  rowLabel,
  yearOptions,
} from "./period-options.helpers";

// The quarter's months and the whole quarter, or a year's quarters and the
// whole year, as links that keep the page's filters in the URL
// (design-system.md §9, months). On phones they
// share the width with little padding, so "Noviembre" and "Diciembre" fit
// at 360px.
function MonthLinks({
  label,
  options,
}: {
  label: string;
  options: readonly PeriodOption[];
}) {
  return (
    <nav
      aria-label={label}
      className="flex w-full rounded-full bg-surface/80 p-[5px] shadow-chip sm:w-auto"
    >
      {options.map((option) => (
        <Link
          key={option.key}
          href={option.href}
          aria-current={option.isCurrent ? "page" : undefined}
          className={cn(
            "flex min-h-10 flex-1 items-center justify-center rounded-full px-1.5 text-sm whitespace-nowrap sm:flex-none sm:px-4",
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
 * The account switch, when there are several, the quarter picker, with the
 * years where the page offers them (10.2b), and the months or a year's
 * quarters (docs/ui/v8-03, v8-18), whose links are the page's own (`hrefOf`), then
 * the page's action when it has one ("Subir extracto"); they stack at full
 * width on phones.
 */
export function PeriodControls({
  choices,
  hrefOf,
  action,
}: {
  choices: AnyPeriodChoices;
  hrefOf: HrefOf;
  action?: ReactNode;
}) {
  const picker = pickerLabel(choices.period);
  return (
    <div className="flex flex-wrap items-center gap-3">
      {choices.accounts.length > 1 && (
        <LinkMenu
          label={accountShortLabel(choices.account, choices.account.last4)}
          options={accountOptions(choices, hrefOf)}
        />
      )}
      <LinkMenu
        label={picker.label}
        ariaLabel={picker.ariaLabel}
        icon={<Calendar aria-hidden strokeWidth={1.7} />}
        options={[
          ...quarterOptions(choices, hrefOf),
          ...yearOptions(choices, hrefOf),
        ]}
      />
      <MonthLinks
        label={rowLabel(choices)}
        options={monthOptions(choices, hrefOf)}
      />
      {action}
    </div>
  );
}
