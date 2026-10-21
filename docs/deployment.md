# Deployment

How xtrakto.site runs and how it was set up. Until the private beta (Stage 7), production serves only the waitlist ([ADR 0022](adr/0022-waitlist-only-deployment.md)); Phase 7.2 completes this guide when the app goes on.

## What runs where

| Piece    | Where                                                                                                            |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| App      | Vercel project `xtrakto` (team "ingcarlostello's projects"), from GitHub `ingcarlostello/xtrakto`, branch `main` |
| Database | Neon project `xtrakto`, branch `main`, database `neondb`, AWS us-east-1                                          |
| Domain   | xtrakto.site, registered and with its DNS at Hostinger; www.xtrakto.site redirects to it (308)                   |
| Email    | None yet: the domain has no MX records, so hola@xtrakto.site needs a mailbox or a forward at Hostinger           |

## Vercel project

- Framework Next.js, root directory `apps/web` (Vercel installs the whole pnpm workspace from the repository's root), Node.js 22.x.
- Production deploys every push to `main`. Preview deployments are off: they would need their own database and keys (Phase 7.2).
- Environment variables, production only:

| Variable        | Value                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `WAITLIST_ONLY` | `1`: only the waitlist, no Clerk (ADR 0022)                                                            |
| `DATABASE_URL`  | The application role `xtrakto_app` on Neon's pooled host, with `sslmode=verify-full`. Type "sensitive" |

To turn the app on (7.2): remove `WAITLIST_ONLY`, add the variables `.env.example` documents with production values (Clerk's production instance, Inngest's integration, `IDENTIFIER_HASH_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`), and deploy again: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is inlined at build time.

## Database

Set up once, from a laptop, as Neon's owner role (`neondb_owner`):

1. Create the application role with SQL, never from Neon's console or API (those roles join `neon_superuser`, which bypasses Row-Level Security), with a random password of 48 hex characters:
   `CREATE ROLE xtrakto_app WITH LOGIN PASSWORD '…' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;`
   Check `rolbypassrls = false` and that it belongs to no role.
2. Apply the migrations with the owner's direct (not pooled) URL and `sslmode=verify-full`:
   `DATABASE_MIGRATION_URL='…' pnpm db:migrate`
3. Build `DATABASE_URL` for Vercel from the application role, the password and the host with `-pooler` after the endpoint id.
4. Check as the application role: it can add to `waitlist_entries` and gets `permission denied` (42501) reading it.
5. Reset the owner's password in Neon afterwards: it was handled outside the console. Still to do (2026-10-21): Phase 7.2 resets it before its URL becomes the migrations job's secret.

Production has the migrations up to `0010`, the ones the waitlist needs (applied on 2026-10-15). The later ones wait for Phase 7.2's CI job, which applies every pending migration on each merge to `main`, starting with its first run; none goes by hand before it. They must stay backward compatible, since Vercel deploys while they run (system design §9).

## DNS at Hostinger

As Vercel's domain check asks (`GET /v6/domains/{domain}/config`):

| Name  | Type  | Value                                  | Replaces                   |
| ----- | ----- | -------------------------------------- | -------------------------- |
| `@`   | A     | `216.198.79.1`, `64.29.17.1`           | `2.57.91.91` (Hostinger's) |
| `www` | CNAME | `7c941226ed1b8896.vercel-dns-017.com.` | `xtrakto.site.`            |

The SPF, DKIM and DMARC records Hostinger created stay as they are. Vercel issues the HTTPS certificate once the records resolve.

## Checking it

Last checked on 2026-10-21 (Phase 7.1):

- `https://xtrakto.site` and any other path answer 307 to `/waitlist`, which answers 200; `https://www.xtrakto.site` answers 308 to the apex.
- The certificate is Let's Encrypt's, which Vercel renews by itself, and every response carries `Strict-Transport-Security`.
- Vercel's domain check says `misconfigured: false`, and both domains are `verified` in the project.
- Every merge to `main` deployed to production; there is no preview deployment.

The Vercel MCP answers 403 or 404 for this project, reads included, so these checks go through the CLI after `vercel login`, with the team's id as `teamId`:

- `vercel api "/v6/domains/xtrakto.site/config?teamId=…"`
- `vercel api "/v9/projects/xtrakto/domains?teamId=…"`
- `vercel api "/v6/deployments?teamId=…&projectId=…&target=production&limit=5"`

## The waitlist's data

- Only the owner role reads the list: to send the launch notice, or to delete someone who writes to hola@xtrakto.site (ADR 0021).
- The Neon MCP connects as the owner, which bypasses Row-Level Security: never query `waitlist_entries` through it, and cut its reach to this project before the list grows (a project-scoped connection, or none).

## Before telling people about it

- The hola@xtrakto.site mailbox or forward.
- The legal review of the consent and the data-treatment policy (Ley 1581 de 2012).
- Anti-bot protection: a Vercel Firewall rate limit on the waitlist's form.
