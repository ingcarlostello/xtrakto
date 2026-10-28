import { Globe, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { initialOf } from "../profile.helpers";
import { ACCOUNT_COPY as COPY } from "../user.constants";
import type { ProfileAccount } from "../user.types";
import { ManageSignInButton } from "./ManageSignInButton";

const SIGN_IN_ICONS = { google: Globe, email: Mail } as const;

// An email that doesn't fit breaks before its "@", not inside a word.
const breakingAtSign = (text: string) => {
  const at = text.indexOf("@");
  if (at <= 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <wbr />
      {text.slice(at)}
    </>
  );
};

type XtraktoAccountProps = {
  account: Pick<ProfileAccount, "name" | "email" | "signsInWith">;
};

/**
 * "Tu cuenta en Xtrakto" (docs/ui/v8-11): the avatar's letter, the name and
 * email Clerk keeps, how the user signs in, and the way to Clerk's profile.
 * Without a name, the email takes its place.
 */
export function XtraktoAccount({
  account: { name, email, signsInWith },
}: XtraktoAccountProps) {
  const title = name ?? email ?? "";
  const Icon = SIGN_IN_ICONS[signsInWith];
  return (
    <Card variant="card">
      <h2 className="text-section font-bold">{COPY.title}</h2>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span
            aria-hidden
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-ink font-display text-amount-l font-medium text-white"
          >
            {initialOf(title)}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="font-display text-amount-m font-medium break-words">
              {name ?? breakingAtSign(title)}
            </p>
            {name && email && (
              <p className="text-sm break-words text-ink-secondary">
                {breakingAtSign(email)}
              </p>
            )}
            <p className="flex items-center gap-1.5 text-caption text-ink-muted">
              <Icon aria-hidden strokeWidth={1.7} className="size-4 shrink-0" />
              {COPY.signsIn[signsInWith]}
            </p>
          </div>
        </div>
        <ManageSignInButton label={COPY.manage} />
      </div>
    </Card>
  );
}
