import type { UserCategoryRule } from "@xtrakto/core";
import { ChevronRight, Tag } from "lucide-react";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { ruleRows } from "../categories.helpers";
import { CATEGORIES_COPY } from "../categories.constants";
import type { RuleRow } from "../categories.types";

const COPY = CATEGORIES_COPY.rules;

// A rule: its bank text as printed, or its number, over what it says.
function Rule({ row }: { row: RuleRow }) {
  return (
    <li className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-x-3.5 border-t border-divider py-3">
      <span
        aria-hidden
        className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-ink"
      >
        <Tag strokeWidth={1.7} className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-meta tracking-[0.02em] break-words whitespace-pre-wrap text-ink-muted">
          {row.text}
        </p>
        <p className="flex items-center gap-1 text-caption font-bold">
          <ChevronRight
            aria-hidden
            strokeWidth={2}
            className="size-3.5 shrink-0"
          />
          {row.meaning}
        </p>
      </div>
    </li>
  );
}

/**
 * "Tus reglas" (docs/ui/v8-05): what the user answered in the quick review
 * or corrected in Movimientos, each rule's bank text or number over what it
 * says; or that there are none yet.
 */
export function YourRules({ rules }: { rules: readonly UserCategoryRule[] }) {
  const rows = ruleRows(rules);
  return (
    <Card variant="card" className="gap-0">
      <CardHeader className="pb-2">
        <h2 className="text-section font-bold text-balance">{COPY.title}</h2>
        <CardDescription>{COPY.subtitle}</CardDescription>
      </CardHeader>
      {rows.length === 0 ? (
        <p className="text-caption text-ink-muted">{COPY.none}</p>
      ) : (
        <ul aria-label={COPY.title}>
          {rows.map((row) => (
            <Rule key={row.key} row={row} />
          ))}
        </ul>
      )}
    </Card>
  );
}
