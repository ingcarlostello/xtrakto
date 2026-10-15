# 0022. A waitlist-only deployment

- **Status:** Accepted
- **Date:** 2026-10-15

## Context

The human wants the waitlist (16.0b, 16.0c) public on xtrakto.site before the app is ready: Stage 7 (the private beta) is still far, and with it the production instances of Clerk and Inngest, the hash key, the webhook and the rest of Phase 7.2. The app as built needs all of them to start (`env.ts`), loads Clerk on every page from the root layout, and its proxy sends a visitor without a session from any other path to Clerk's sign-in. Publishing it whole would expose an unfinished app and its sign-up, and need services that have nothing to do yet.

## Decision

- **One switch.** A deployment with `WAITLIST_ONLY=1` serves only the waitlist (`lib/site.ts`). The proxy skips Clerk and redirects every other path, the app's home and its API included, to `/waitlist` (307: the root becomes the app later). Static files, the video, `robots.txt` and the sitemap pass through untouched.
- **Only the database.** In that mode the server validates `DATABASE_URL` alone (`parseWaitlistEnv`), with the same rule that a hosted database needs `sslmode=verify-full`. Anything that asks for the whole environment there (an action called by id from another page, a route handler) throws, so it fails closed.
- **Clerk out of the root layout.** `ClerkProvider` wraps only the app's and sign-in's layouts (`ClerkRoot`). The waitlist never loads Clerk's script or cookies, in either mode.
- **robots.txt and a sitemap** that lists the waitlist, outside the proxy.
- **Production is Neon's `main` branch**, as planned (system design §9): the application role `xtrakto_app` was created with SQL (`NOBYPASSRLS`, no membership), and the migrations ran as the owner from a laptop, since the CI migrations job comes with Phase 7.2.
- **Production deploys only.** The Vercel project builds `main` with `apps/web` as its root; preview deployments are off until 7.2 gives them their own database and keys.

## Alternatives considered

- **The whole app with production Clerk and Inngest:** the work of 7.2 now, and an open sign-up into an app that can't yet show a summary.
- **A separate static site for the waitlist:** a second deployment, and the form's action and its database guarantees (ADR 0021) built twice.
- **Clerk's development keys in production:** a development instance does a handshake through its own domain and sets third-party cookies on every visit, and Clerk advises against it.

## Consequences

- Turning the app on in production (7.1, 7.2) means removing `WAITLIST_ONLY` and adding the variables `env.ts` asks for; nothing else changes.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is inlined at build time: a build without it (as the waitlist's) can't serve the app's pages, so turning the app on needs a new build, which a new variable triggers on Vercel anyway.
- The production database holds the waitlist's names and emails. The Neon MCP runs as the owner, which bypasses Row-Level Security, so it could read them: its reach must be cut before production holds data (a project-scoped or removed MCP), and nobody reads the table except to send the launch notice or delete someone who asks.
- Deleting someone who asks, and exporting the list, are done by hand as the owner (ADR 0021).
