import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { MovementIcon } from "@/components/movement-icon/MovementIcon";
import { periodLinkOf } from "@/components/period-controls/period-options.helpers";
import { Button } from "@/components/ui/button";
import { categoryLabel } from "@/utils/category-label.helpers";
import { categoriesHref } from "@/utils/transactions-url.helpers";
import { CATEGORIES_COPY } from "../categories.constants";
import type { CategoryDetail } from "../categories.types";
import { detailSubtitle } from "../category-detail.helpers";

/**
 * The way back to Categorías, in the same account and period, then the
 * category's chip, its name and what it counts as in the period
 * (docs/ui/v8-06).
 */
export function CategoryTitle({ detail }: { detail: CategoryDetail }) {
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="link"
        nativeButton={false}
        className="gap-1 self-start"
        render={<Link href={categoriesHref(periodLinkOf(detail))} />}
      >
        <ChevronLeft aria-hidden strokeWidth={2.2} className="size-4" />
        {CATEGORIES_COPY.detail.back}
      </Button>
      <div className="flex items-center gap-3.5">
        <MovementIcon categoryId={detail.categoryId} tone="spending" />
        <PageHeader
          title={categoryLabel(detail.categoryId)}
          subtitle={detailSubtitle(detail.period)}
        />
      </div>
    </div>
  );
}
