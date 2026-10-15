// The site's address and what a deployment serves. Not server-only: the proxy
// reads the mode too.

/** The production address, for metadata, robots.txt and the sitemap. */
export const SITE_URL = "https://xtrakto.site";

/**
 * Whether this deployment serves only the waitlist (16.0d, ADR 0022): the
 * proxy sends every other path to it, without Clerk, and the server needs
 * only the database. Read at runtime, not at build time.
 */
export const isWaitlistOnly = (): boolean =>
  // Read at runtime by the proxy and the server, never during a Turborepo task.
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  process.env.WAITLIST_ONLY === "1";
