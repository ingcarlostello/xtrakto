import Link from "next/link";
import { cn } from "@/utils/cn.utils";
import { TRANSACTIONS_COPY } from "../transaction.constants";
import type { FilterOption } from "../transaction.types";

/**
 * "Todo / Ingresos / Gasto real / Movido / Por revisar · 24": filter chips
 * that are links, so the filter lives in the URL (design-system.md §9).
 */
export function KindFilters({ options }: { options: readonly FilterOption[] }) {
  return (
    <nav aria-label={TRANSACTIONS_COPY.kinds.filtersLabel} className="pt-3">
      <ul className="flex flex-wrap gap-2">
        {options.map(({ label, href, isCurrent }) => (
          <li key={label}>
            <Link
              href={href}
              scroll={false}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                "inline-flex min-h-[38px] items-center rounded-full px-3.5 text-caption whitespace-nowrap",
                isCurrent
                  ? "bg-primary-soft font-bold text-primary-strong"
                  : "bg-surface-muted font-semibold text-ink-secondary hover:text-ink",
              )}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
