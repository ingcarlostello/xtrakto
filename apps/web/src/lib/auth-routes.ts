// The pages a signed-out visitor may open. Constants rather than environment
// variables: they are the same in every environment.
export const AUTH_ROUTES = {
  signIn: "/sign-in",
  signUp: "/sign-up",
} as const;

const PUBLIC_PATH_PREFIXES = [AUTH_ROUTES.signIn, AUTH_ROUTES.signUp];

/**
 * Whether a signed-out visitor may open this path. Only the proxy's early
 * redirect uses it: every page, action and route handler still checks the
 * session itself.
 */
export const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
