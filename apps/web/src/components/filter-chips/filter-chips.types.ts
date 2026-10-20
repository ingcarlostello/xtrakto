import type { PeriodHref } from "@/components/period-controls/period-controls.types";

/** A filter chip: what it shows and its link; the current one is marked. */
export type FilterChip = {
  readonly label: string;
  readonly href: PeriodHref;
  readonly isCurrent: boolean;
};
