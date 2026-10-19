import { Card } from "@/components/ui/card";
import { correctionView } from "../correction.helpers";
import { movementDetailView } from "../movement-detail.helpers";
import { ownRulesView } from "../own-rules.helpers";
import { listLinkOf } from "../period-selector.helpers";
import { detailLinks } from "../transaction-list.helpers";
import { TRANSACTIONS_COPY } from "../transaction.constants";
import type { AccountTransactions } from "../transaction.types";
import { MovementDetailPanel } from "./MovementDetailPanel";

const COPY = TRANSACTIONS_COPY.detail;

// Before a movement is chosen, what choosing one shows; on phones, nothing.
function NoMovementChosen() {
  return (
    <Card variant="card" className="gap-1.5 max-lg:hidden">
      <h2 className="text-section font-bold text-balance">{COPY.emptyTitle}</h2>
      <p className="text-caption text-ink-muted">{COPY.emptyDescription}</p>
    </Card>
  );
}

/**
 * The movements list's side column (docs/ui/v8-03): the detail of the
 * movement the URL asks, which stays in sight as the list scrolls.
 */
export function MovementDetailColumn({
  transactions,
}: {
  transactions: AccountTransactions;
}) {
  const { detail, account, items } = transactions;
  const { close } = detailLinks(listLinkOf(transactions), {
    shown: items.length,
  });
  return (
    <div className="lg:sticky lg:top-6">
      {detail ? (
        <MovementDetailPanel
          key={detail.movement.id}
          view={movementDetailView(detail.movement, account.id)}
          correction={correctionView(detail, account.id)}
          own={ownRulesView(detail, account.id)}
          closeHref={close}
        />
      ) : (
        <NoMovementChosen />
      )}
    </div>
  );
}
