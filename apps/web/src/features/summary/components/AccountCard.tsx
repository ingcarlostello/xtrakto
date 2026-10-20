import Link from "next/link";
import { StatementIllustration } from "@/components/empty-state/StatementIllustration";
import { StatusPill } from "@/components/status-pill/StatusPill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { accountCardView } from "../account-card.helpers";
import { SUMMARY_COPY } from "../summary.constants";
import type { AccountCardView, AccountSummary } from "../summary.types";

const COPY = SUMMARY_COPY.account;

// "Saldo al 30 de septiembre" over the balance, when a statement printed it.
function Balance({ balance }: Pick<AccountCardView, "balance">) {
  if (!balance) return null;
  return (
    <div className="flex flex-col">
      <p className="text-caption text-ink-muted">{balance.label}</p>
      <p className="font-display text-amount-xl font-medium tabular-nums">
        {balance.amount}
      </p>
    </div>
  );
}

// The bank's own figures, each in its small box.
function BankFigures({ figures }: Pick<AccountCardView, "figures">) {
  if (figures.length === 0) return null;
  return (
    <dl className="grid grid-cols-2 gap-2">
      {figures.map(({ label, value }) => (
        <div key={label} className="rounded-sm bg-surface px-3 py-2.5">
          <dt className="text-meta text-ink-muted">{label}</dt>
          <dd className="font-display text-base font-medium tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * "Tu cuenta" (docs/ui/v8-01, design-system.md §9 account card): the
 * balance at the period's end, the account, the bank's own figures and the
 * status pill, beside the statement illustration from `sm`.
 */
export function AccountCard({ summary }: { summary: AccountSummary }) {
  const view = accountCardView(summary);
  return (
    <section aria-labelledby="account" className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-0.5">
        <h2 id="account" className="text-section font-bold">
          {COPY.title}
        </h2>
        <p className="text-caption text-ink-muted">{COPY.subtitle}</p>
      </div>
      <Card variant="panel" className="flex-row items-start gap-4 p-5.5">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Balance balance={view.balance} />
          <p className="text-sm text-ink-secondary">{view.account}</p>
          <BankFigures figures={view.figures} />
          <StatusPill {...view.status} />
          {view.breaksHref && (
            <Button
              variant="link"
              nativeButton={false}
              render={<Link href={view.breaksHref} />}
              className="self-start"
            >
              {COPY.breaks}
            </Button>
          )}
        </div>
        <StatementIllustration className="hidden w-24 shrink-0 sm:block" />
      </Card>
    </section>
  );
}
