// The pages a signed-out visitor may open. Constants rather than environment
// variables: they are the same in every environment.
export const AUTH_ROUTES = {
  signIn: "/sign-in",
  signUp: "/sign-up",
} as const;

// Called by Clerk, without a session: its signature is the check (4.5).
export const CLERK_WEBHOOK_ROUTE = "/api/webhooks/clerk";

// Called by Inngest to sync and run functions, without a session: in Cloud
// mode the SDK verifies Inngest's signature on every request (5.1).
export const INNGEST_ROUTE = "/api/inngest";

// The waitlist and its "joined" page, for anyone, with their action: it adds
// to the list and reads nothing back (16.0b, ADR 0021).
export const WAITLIST_ROUTES = {
  join: "/waitlist",
  joined: "/waitlist/joined",
} as const;

const PUBLIC_PATH_PREFIXES = [
  AUTH_ROUTES.signIn,
  AUTH_ROUTES.signUp,
  CLERK_WEBHOOK_ROUTE,
  INNGEST_ROUTE,
  WAITLIST_ROUTES.join,
];

/**
 * Whether a signed-out visitor may open this path. Only the proxy's early
 * redirect uses it: every page, action and route handler still checks the
 * session itself.
 */
export const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
