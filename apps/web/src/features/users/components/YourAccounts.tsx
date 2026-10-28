import type { AccountRow } from "@xtrakto/db";
import { Landmark, type LucideIcon, Smartphone } from "lucide-react";
import type { ReactNode } from "react";
import {
  CATEGORY_ICONS,
  TONE_CLASSES,
} from "@/components/movement-icon/category-icons.constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { accountLabel } from "@/utils/account-label.helpers";
import { cn } from "@/utils/cn.utils";
import { type OwnRuleRow, ownRuleRows } from "../profile.helpers";
import { YOURS_COPY as COPY } from "../user.constants";
import type { YourAccounts as Yours } from "../user.types";
import { RemoveOwnRuleButton } from "./RemoveOwnRuleButton";

const TITLE_ID = "yours-title";

// A chip, a title over its line, and the row's action, if any.
function Row({
  icon: Icon,
  title,
  line,
  action,
}: {
  icon: LucideIcon;
  title: ReactNode;
  line: string;
  action?: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-3.5 border-t border-divider py-3.5">
      <span
        aria-hidden
        className={cn(
          "flex size-11 items-center justify-center rounded-full",
          TONE_CLASSES.moved.chip,
        )}
      >
        <Icon strokeWidth={1.9} className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body font-bold break-words">
          {title}
        </p>
        <p className="text-caption break-words text-ink-muted">{line}</p>
      </div>
      {action}
    </li>
  );
}

function AccountItem({ account }: { account: AccountRow }) {
  return (
    <Row
      icon={Landmark}
      title={accountLabel(account, account.last4)}
      line={account.last4 ? COPY.identified : COPY.unidentified}
    />
  );
}

function OwnRuleItem({ row }: { row: OwnRuleRow }) {
  return (
    <Row
      icon={row.isNumber ? Smartphone : CATEGORY_ICONS[row.categoryId]}
      title={
        <>
          {row.title}
          <Badge variant="ok">{row.isMine}</Badge>
        </>
      }
      line={row.line}
      action={
        <RemoveOwnRuleButton
          ruleId={row.id}
          label={row.notMine}
          focusOnDone={TITLE_ID}
        />
      }
    />
  );
}

/**
 * "Tus cuentas y lo que es tuyo" (docs/ui/v8-11): the user's accounts, then
 * their rules that make something theirs, each with its "×". Without an
 * account, or without such a rule, it says where they come from.
 */
export function YourAccounts({
  accounts,
  ownRules,
}: Pick<Yours, "accounts" | "ownRules">) {
  const rules = ownRuleRows(ownRules);
  return (
    <Card variant="card" className="gap-0">
      <CardHeader className="pb-3">
        <h2
          id={TITLE_ID}
          tabIndex={-1}
          className="text-section font-bold focus-visible:outline-none"
        >
          {COPY.title}
        </h2>
        <CardDescription>{COPY.description}</CardDescription>
      </CardHeader>
      {accounts.length === 0 ? (
        <p className="text-caption text-ink-muted">{COPY.noAccounts}</p>
      ) : (
        <ul aria-labelledby={TITLE_ID}>
          {accounts.map((account) => (
            <AccountItem key={account.id} account={account} />
          ))}
          {rules.map((row) => (
            <OwnRuleItem key={row.id} row={row} />
          ))}
        </ul>
      )}
      {accounts.length > 0 && rules.length === 0 && (
        <p className="border-t border-divider pt-3.5 text-caption text-ink-muted">
          {COPY.noRules}
        </p>
      )}
    </Card>
  );
}
