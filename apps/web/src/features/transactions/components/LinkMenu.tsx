"use client";

import { Menu } from "@base-ui/react/menu";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn.utils";
import type { PeriodOption } from "../transaction.types";

function LinkMenuOption({ option }: { option: PeriodOption }) {
  return (
    <Menu.LinkItem
      closeOnClick
      aria-current={option.isCurrent ? "true" : undefined}
      render={<Link href={option.href} />}
      className={cn(
        "flex min-h-11 items-center justify-between gap-4 rounded-sm px-3 text-sm outline-none",
        option.isCurrent
          ? "bg-primary-soft font-bold text-primary-strong"
          : "font-semibold text-ink data-highlighted:bg-surface-muted",
      )}
    >
      <span className="whitespace-nowrap">{option.label}</span>
      {option.badge && (
        <Badge variant={option.badge.variant}>{option.badge.label}</Badge>
      )}
    </Menu.LinkItem>
  );
}

type LinkMenuProps = {
  readonly label: string;
  /** When the label alone doesn't say what it chooses. */
  readonly ariaLabel?: string;
  readonly icon?: ReactNode;
  readonly options: readonly PeriodOption[];
};

// A white pill that opens a list of links (design-system.md §9, period
// selector): the quarters, or the accounts. Each option navigates, so the
// filters stay in the URL; the current one is marked.
export function LinkMenu({ label, ariaLabel, icon, options }: LinkMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={ariaLabel}
        className="inline-flex min-h-11 w-full items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold text-ink shadow-chip hover:bg-surface-muted sm:w-auto [&_svg]:size-[18px] [&_svg]:shrink-0"
      >
        {icon}
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown aria-hidden strokeWidth={2} className="text-ink-muted" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="start" className="z-50">
          <Menu.Popup className="flex min-w-(--anchor-width) flex-col gap-0.5 rounded-md bg-surface p-1.5 shadow-pop outline-none">
            {options.map((option) => (
              <LinkMenuOption key={option.key} option={option} />
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
