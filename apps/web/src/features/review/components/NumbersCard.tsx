import { Card } from "@/components/ui/card";
import {
  type MovementPeriod,
  periodParam,
} from "@/utils/transactions-url.helpers";
import { numberView } from "../review-display.helpers";
import type { GroupMovements, ReviewGroupId } from "../review.types";
import { NumbersForm } from "./NumbersForm";
import { GroupHeading } from "./ReviewGroupCard";

type NumbersCardProps = {
  id: ReviewGroupId;
  /** What it asks about: what waits, or, asked again, what was answered. */
  movements: GroupMovements;
  accountId: string;
  period: MovementPeriod;
  isChange?: boolean;
};

/**
 * A question asked number by number (design-system.md §9, review group
 * card): the Nequi numbers, each with its switch.
 */
export function NumbersCard({
  id,
  movements,
  accountId,
  period,
  isChange = false,
}: NumbersCardProps) {
  return (
    <Card variant="card">
      <GroupHeading id={id} movements={movements} />
      <NumbersForm
        numbers={(movements.numbers ?? []).map(numberView)}
        accountId={accountId}
        period={periodParam(period)}
        isChange={isChange}
      />
    </Card>
  );
}
