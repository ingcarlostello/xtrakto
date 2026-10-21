import { Tag } from "lucide-react";
import { BANK_TEXT } from "@/components/movement-row/movement-row.constants";
import { Card } from "@/components/ui/card";
import { CATEGORIES_COPY } from "../categories.constants";
import type { CategoryDetail } from "../categories.types";
import { categorySettings } from "../category-detail.helpers";

const COPY = CATEGORIES_COPY.settings;

/**
 * "Ajustes de esta categoría" (docs/ui/v8-06): what it counts as, and the
 * user's rules that give it. v8's "Mover movimientos a otra categoría" and
 * "Ver reglas" wait for a phase that moves movements or edits rules.
 */
export function CategorySettings({ detail }: { detail: CategoryDetail }) {
  const settings = categorySettings(detail);
  return (
    <Card variant="card">
      <h2 className="text-section font-bold text-balance">{COPY.title}</h2>
      <div className="flex flex-col gap-0.5 rounded-md bg-surface-muted p-4">
        <p className="text-body font-bold">{COPY.countsAs}</p>
        <p className="text-caption text-ink-muted">{settings.countsAs}</p>
      </div>
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-x-3.5">
        <span
          aria-hidden
          className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-ink"
        >
          <Tag strokeWidth={1.7} className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-body font-bold">{settings.rulesTitle}</p>
          <p
            className={
              settings.hasRules
                ? `text-meta text-ink-muted ${BANK_TEXT}`
                : "text-caption text-ink-muted"
            }
          >
            {settings.rulesNote}
          </p>
        </div>
      </div>
    </Card>
  );
}
