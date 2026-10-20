import Link from "next/link";
import { cn } from "@/utils/cn.utils";
import type { FilterChip } from "./filter-chips.types";

type FilterChipsProps = {
  /** What the chips choose: "Mostrar". */
  label: string;
  options: readonly FilterChip[];
  className?: string;
};

/**
 * Filter chips that are links, so the filter lives in the URL
 * (design-system.md §9): Movimientos's kinds, Pagos fijos's lists.
 */
export function FilterChips({ label, options, className }: FilterChipsProps) {
  return (
    <nav aria-label={label} className={className}>
      <ul className="flex flex-wrap gap-2">
        {options.map((option) => (
          <li key={option.label}>
            <Link
              href={option.href}
              scroll={false}
              aria-current={option.isCurrent ? "page" : undefined}
              className={cn(
                "inline-flex min-h-[38px] items-center rounded-full px-3.5 text-caption whitespace-nowrap",
                option.isCurrent
                  ? "bg-primary-soft font-bold text-primary-strong"
                  : "bg-surface-muted font-semibold text-ink-secondary hover:text-ink",
              )}
            >
              {option.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
