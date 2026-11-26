import Link from "next/link";
import { MovementIcon } from "@/components/movement-icon/MovementIcon";
import {
  BANK_TEXT,
  ROW_LINK,
} from "@/components/movement-row/movement-row.constants";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn.utils";
import { installmentsLeftView } from "../installments-left.helpers";
import { SUMMARY_COPY } from "../summary.constants";
import type { AccountSummary, InstallmentRowView } from "../summary.types";

const COPY = SUMMARY_COPY.installments;

// A purchase: its title, a link to its detail, over the bank's text and
// the installment its latest statement charged; what's left at its right.
function InstallmentRow({ row }: { row: InstallmentRowView }) {
  const bankTextId = `installment-${row.id}-bank`;
  return (
    <li className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-x-3.5 border-t border-divider py-3.5">
      <MovementIcon categoryId={row.categoryId} tone={row.tone} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p
          className={cn(
            "text-body",
            row.isBankText ? `font-semibold ${BANK_TEXT}` : "font-bold",
          )}
        >
          <Link
            href={row.href}
            aria-describedby={row.bankText ? bankTextId : undefined}
            className={ROW_LINK}
          >
            {row.title}
          </Link>
        </p>
        {row.bankText && (
          <p
            id={bankTextId}
            className={`text-meta text-ink-muted ${BANK_TEXT}`}
          >
            {row.bankText}
          </p>
        )}
        <p className="pt-1 text-caption text-ink-secondary">{row.note}</p>
      </div>
      <div className="text-right">
        <p className="font-display text-base leading-[1.3] font-medium tabular-nums">
          {row.left}
        </p>
        <p className="text-meta text-ink-muted">{row.until}</p>
      </div>
    </li>
  );
}

/**
 * "Cuotas que te faltan" (12.3d), on a card's summary beside "Tu extracto,
 * traducido", last on phones: what its latest statement still charges of
 * its purchases in installments, what they add up to, and each with what's
 * left and until when, opening its detail in Movimientos.
 */
export function InstallmentsLeft({ summary }: { summary: AccountSummary }) {
  const view = installmentsLeftView(summary);
  if (!view) return null;
  return (
    <section aria-labelledby="installments" className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-0.5">
        <h2 id="installments" className="text-section font-bold">
          {COPY.title}
        </h2>
        <p className="text-caption text-ink-muted">{view.subtitle}</p>
      </div>
      <Card variant="card" className="gap-0 p-5.5">
        <p className="text-sm font-semibold text-ink-secondary">{view.total}</p>
        {view.rows.length > 0 && (
          <ul className="pt-2">
            {view.rows.map((row) => (
              <InstallmentRow key={row.id} row={row} />
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
