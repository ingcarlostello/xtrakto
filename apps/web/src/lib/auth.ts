import "server-only";
import { auth } from "@clerk/nextjs/server";

/**
 * The signed-in user's Clerk id; a signed-out visitor is redirected to sign
 * in. Call it at the top of every protected page and layout: the proxy's
 * early redirect alone doesn't protect a route.
 */
export const requireSignedIn = async (): Promise<string> => {
  const { userId } = await auth.protect();
  return userId;
};

/**
 * The signed-in user's Clerk id, or `null`. For server actions, which return
 * a `Result` instead of the 401 that `auth.protect()` would throw.
 */
export const getSignedInClerkUserId = async (): Promise<string | null> => {
  const { isAuthenticated, userId } = await auth();
  return isAuthenticated ? userId : null;
};
