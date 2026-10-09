import { useClerk } from "@clerk/nextjs";
import { useState } from "react";
import { AUTH_ROUTES } from "@/lib/auth-routes";
import { deleteAccount } from "../actions/delete-account.action";
import { DELETE_ACCOUNT_COPY } from "../user.constants";

/**
 * Deletes the account through the server action, then ends the session in
 * the browser: the Clerk user is gone, but its cookie isn't.
 *
 * Deliberately no `startTransition`: Clerk's `signOut` navigates inside its
 * own transition and resolves when that one commits, which React holds back
 * while another async transition is pending, so awaiting it inside one hangs.
 */
export const useDeleteAccount = () => {
  const { signOut } = useClerk();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async (): Promise<void> => {
    setError(null);
    setIsPending(true);
    // An unexpected failure (database, Clerk) rejects the action.
    const result = await deleteAccount().catch(() => null);
    if (!result?.ok) {
      setError(
        result ? DELETE_ACCOUNT_COPY.signedOut : DELETE_ACCOUNT_COPY.failed,
      );
      setIsPending(false);
      return;
    }
    // Clerk may refuse to end a deleted user's session; leave anyway.
    await signOut({ redirectUrl: AUTH_ROUTES.signIn }).catch(() =>
      window.location.assign(AUTH_ROUTES.signIn),
    );
  };

  return { isPending, error, confirm };
};
