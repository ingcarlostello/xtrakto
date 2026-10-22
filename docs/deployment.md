# Deployment

How xtrakto.site runs and how it was set up. Since Phase 7.2, production serves the whole app as a private beta: anyone can join the waitlist, and only the people invited from Clerk can create an account ([ADR 0027](adr/0027-private-beta-by-invitation.md)). Before it, production served only the waitlist ([ADR 0022](adr/0022-waitlist-only-deployment.md)), which `WAITLIST_ONLY=1` still brings back.

## What runs where

| Piece           | Where                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| App             | Vercel project `xtrakto` (team "ingcarlostello's projects"), from GitHub `ingcarlostello/xtrakto`, branch `main` |
| Database        | Neon project `xtrakto`, branch `main`, database `neondb`, AWS us-east-1                                          |
| Auth            | Clerk application "Xtrakto", its production instance on xtrakto.site                                             |
| Background jobs | Inngest Cloud's production environment, through its Vercel integration                                           |
| Domain          | xtrakto.site, registered and with its DNS at Hostinger; www.xtrakto.site redirects to it (308)                   |
| Email           | Clerk sends its own (codes, invitations) from clkmail.xtrakto.site; the domain has no MX records for hola@       |

## Vercel project

- Framework Next.js, root directory `apps/web` (Vercel installs the whole pnpm workspace from the repository's root), Node.js 22.x.
- Production deploys every push to `main`. Preview deployments are off: they would need their own database and keys (system design §9).
- Environment variables, production only. `env.ts` stops the server if one is missing or malformed:

| Variable                            | Value                                                                                                                                                                                         | Type      |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `DATABASE_URL`                      | The application role `xtrakto_app` on Neon's pooled host, with `sslmode=verify-full`                                                                                                          | Sensitive |
| `IDENTIFIER_HASH_KEY`               | 48 random bytes in base64 (`openssl rand -base64 48`), made once, with a copy in the owner's password manager. Never change it: the references saved before would stop grouping with new ones | Sensitive |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | The production instance's `pk_live_…`. Inlined at build time, so a change needs a new build                                                                                                   | Plain     |
| `CLERK_SECRET_KEY`                  | Clerk's dashboard, production, API keys: `sk_live_…`                                                                                                                                          | Sensitive |
| `CLERK_WEBHOOK_SIGNING_SECRET`      | The signing secret of the webhook endpoint (below), `whsec_…`                                                                                                                                 | Sensitive |
| `INNGEST_SIGNING_KEY`               | Set by Inngest's Vercel integration                                                                                                                                                           | —         |
| `INNGEST_EVENT_KEY`                 | Set by Inngest's Vercel integration                                                                                                                                                           | —         |
| `WAITLIST_ONLY`                     | Absent. `1` turns production back to the waitlist alone (ADR 0022)                                                                                                                            | Plain     |

`INNGEST_DEV` never goes on Vercel: dev mode skips Inngest's signature check, and `env.ts` refuses it there.

Secrets go from one dashboard to the other by hand, or from a 0600 file through `vercel api "/v10/projects/xtrakto/env?teamId=…" --method POST --input <file>`, never typed into a command.

## Clerk

- The production instance of the application "Xtrakto", made from the development instance's settings (through the Clerk MCP, as `clerk deploy` does) on xtrakto.site.
- Sign-up mode "Restricted": only the people invited from Clerk's dashboard (Users, Invitations) create an account (ADR 0027).
- Paths: home `/`, sign-in `/sign-in`, sign-up `/sign-up`, so invitations and Clerk's emails open the app's own pages.
- Sign-in by email code or password, and with Google through the app's own OAuth client: the "Web application" client "Xtrakto Clerk production" of the Google Cloud project `xtrakto`, with `https://xtrakto.site` as its origin and `https://clerk.xtrakto.site/v1/oauth_callback` as its redirect URI; only the basic scopes (`openid`, email, profile). Its consent screen (Google Auth Platform: the app "Xtrakto", external users, xtrakto.site as its home page and authorized domain) stays in "Testing" until 7.5 brings the privacy page Google asks for to publish it: until then only the Google accounts listed as its test users (up to 100) sign in with Google, and everyone else by email.
- "Allow users to delete their account" off (User & authentication, User model): `/settings` deletes the data first (4.5).
- Webhook endpoint `https://xtrakto.site/api/webhooks/clerk` for the event `user.deleted`, which deletes the user's rows (4.5).
- Its DNS records are below; Clerk checks DNS, SSL and mail before the instance works.

## Inngest

Inngest's Vercel integration, on the project `xtrakto`: it sets both keys and syncs the app after each production deployment, at `https://xtrakto.site/api/inngest`. The custom domain, not the deployment's own URL, which Vercel's deployment protection keeps private.

## Database

Set up once, from a laptop, as Neon's owner role (`neondb_owner`):

1. Create the application role with SQL, never from Neon's console or API (those roles join `neon_superuser`, which bypasses Row-Level Security), with a random password of 48 hex characters:
   `CREATE ROLE xtrakto_app WITH LOGIN PASSWORD '…' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;`
   Check `rolbypassrls = false` and that it belongs to no role.
2. Apply the first migrations with the owner's direct (not pooled) URL and `sslmode=verify-full`:
   `DATABASE_MIGRATION_URL='…' pnpm db:migrate`
3. Build `DATABASE_URL` for Vercel from the application role, the password and the host with `-pooler` after the endpoint id.
4. Check as the application role: it can add to `waitlist_entries` and gets `permission denied` (42501) reading it.
5. Reset the owner's password in Neon afterwards, since it was handled outside the console (done in 7.2).

Since 7.2 the "Production migrations" workflow (`.github/workflows/migrate.yml`) applies the pending migrations on every push to `main`, and on demand (Actions, Production migrations, Run workflow). It connects with the repository secret `DATABASE_MIGRATION_URL`: the owner's direct URL with `sslmode=verify-full`. It runs one at a time and is never cancelled halfway. Migrations must stay backward compatible, since Vercel deploys the same push meanwhile (system design §9).

## DNS at Hostinger

For Vercel, as its domain check asks (`GET /v6/domains/{domain}/config`):

| Name  | Type  | Value                                  | Replaces                   |
| ----- | ----- | -------------------------------------- | -------------------------- |
| `@`   | A     | `216.198.79.1`, `64.29.17.1`           | `2.57.91.91` (Hostinger's) |
| `www` | CNAME | `7c941226ed1b8896.vercel-dns-017.com.` | `xtrakto.site.`            |

For Clerk's production instance, as its domain status lists them:

| Name              | Type  | Value                               |
| ----------------- | ----- | ----------------------------------- |
| `clerk`           | CNAME | `frontend-api.clerk.services`       |
| `accounts`        | CNAME | `accounts.clerk.services`           |
| `clkmail`         | CNAME | `mail.z56mdoxvt5fg.clerk.services`  |
| `clk._domainkey`  | CNAME | `dkim1.z56mdoxvt5fg.clerk.services` |
| `clk2._domainkey` | CNAME | `dkim2.z56mdoxvt5fg.clerk.services` |

The SPF, DKIM and DMARC records Hostinger created stay as they are. Vercel and Clerk issue their HTTPS certificates once the records resolve.

## Turning the app on, or back off

1. Every variable above is set, Clerk's domain status is complete, and the migrations workflow ran.
2. Remove `WAITLIST_ONLY` and deploy again from the latest production deployment: a new build, which inlines the publishable key.
3. Check that Inngest synced the app.

Back to the waitlist alone: `WAITLIST_ONLY=1` and deploy again. The other variables can stay.

## Checking it

Last checked on 2026-10-22 (Phase 7.2):

- `https://xtrakto.site` and every page of the app answer 307 to `/sign-in` without a session; `/sign-in` and `/waitlist` answer 200; `https://www.xtrakto.site` answers 308 to the apex; `/api/inngest` answers 401 to a request Inngest didn't sign.
- Clerk's domain status is complete (DNS, SSL for `clerk.` and `accounts.`, mail), and Inngest's app `xtrakto` is synced at `https://xtrakto.site/api/inngest` with its three functions.
- The "Production migrations" workflow ran on the merge of 7.2 and production holds every migration.
- An invited account uploaded the synthetic `quarterly-basic.xlsx`: its job ended with 33 new movements and "Saldo verificado", and the summary showed July to September 2026.
- The certificate is Let's Encrypt's, which Vercel renews by itself, and every response carries `Strict-Transport-Security`.
- Vercel's domain check says `misconfigured: false`, and both domains are `verified` in the project.
- Every merge to `main` deployed to production; there is no preview deployment.

The Vercel MCP answers 403 or 404 for this project, reads included, so these checks go through the CLI after `vercel login`, with the team's id as `teamId`:

- `vercel api "/v6/domains/xtrakto.site/config?teamId=…"`
- `vercel api "/v9/projects/xtrakto/domains?teamId=…"`
- `vercel api "/v6/deployments?teamId=…&projectId=…&target=production&limit=5"`

## The users' data

- Only the owner role reads the waitlist: to send the launch notice, or to delete someone who writes to hola@xtrakto.site (ADR 0021).
- The Neon MCP connects as the owner, which bypasses Row-Level Security: never query `waitlist_entries`, or any user's rows, through it.

## Before telling people about it

- The hola@xtrakto.site mailbox or forward.
- The legal review of the consent and the data-treatment policy (Ley 1581 de 2012).
- Anti-bot protection: a Vercel Firewall rate limit on the waitlist's form.
