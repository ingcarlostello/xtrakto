# Xtrakto

Reply to the user in Spanish, and explain concepts with an example from the app's domain (a statement, a Nequi transfer) before the technical detail. Code, comments, commits and docs stay in English.

System design (read before planning or changing code):

@docs/ARCHITECTURE.md

## How to treat the system design

The architecture is a plan, not a contract. It was written before most of the code exists, so development will surface things it didn't anticipate.

- Use it as the default direction, not as something to follow to the letter.
- If part of it makes the code more complex than the problem needs, or reality contradicts it, change it. Your judgment counts as much as the document.
- When you deviate, say so explicitly: what changes, why, and what it simplifies or fixes. Don't drift away from it silently.
- Keep `docs/ARCHITECTURE.md` in sync with the code: update it in the same change. Significant decisions also get an ADR in `docs/adr/`.
- The `.claude/rules/` files are different: they are standards, not a plan, and their "Always / Never" rules still apply unless the user agrees to change them.

## Roadmap

What to build and in which order (stages, phases, gates, progress). Follow its section 1 workflow, one phase at a time:

@docs/ROADMAP.md

- Before starting any work, check section 5 for the next unticked phase and say which phase it is.
- If the roadmap and the Git section below disagree, the Git section wins: don't stage changes (roadmap step 6) unless the user authorizes it. Propose the commit message instead.
- The phase log lives in `docs/phase-log.md`, not imported here. Read its latest entries when a phase depends on earlier follow-ups.

## Commands

- Node 22 comes from nvm, which the agent's shell may not load. If `node` isn't found, prefix commands with `export PATH="$HOME/.nvm/versions/node/v22.20.0/bin:$PATH"`.
- Before closing a phase, run `pnpm turbo check-types lint test` and `pnpm format:check` (CI runs both). After changing a parser, also run `pnpm --filter @xtrakto/parsers test:private` if real exports are in `packages/parsers/fixtures/private/`; never open or print those files (the private tests report counts only).
- Local PostgreSQL runs in Docker (Docker Desktop must be open): `docker compose up --wait`; `docker compose down -v` deletes its data. `packages/db` tests run when `TEST_DATABASE_URL` and `TEST_DATABASE_MIGRATION_URL` are set (root `.env.local`; always in CI) and then fail if the database is down.
- Schema changes: edit `packages/db/src/**/*.schemas.ts`, then `pnpm db:generate --name=<change>`. Never edit a generated migration; hand-written SQL goes in one made with `drizzle-kit generate --custom`.
- Environment: one root `.env.local` for every tool; `apps/web/next.config.ts` loads it, and `src/lib/env.ts` stops the server at startup if a variable is missing. No `.env*` inside `apps/web`. Turborepo's strict mode keeps shell-exported variables from `pnpm dev`: to try a value, run `pnpm --filter web exec next dev`.
- Real keys live only in the git-ignored `.env.local`; never print them. Fake keys in tests are built at runtime (`fakeKey("whsec", …)` in `apps/web/src/lib/env.test.ts`): a whole secret-shaped literal (`whsec_…`, `sk_test_…`) trips GitHub's secret scanning.

## UI

All UI follows `.claude/rules/design-system.md` (tokens, components, copy, accessibility); the approved v7 screenshots are in `docs/ui/` (layout and feel; the rules file wins on exact values). It loads automatically when you open `.tsx` or `.css` files under `apps/web/src/`. If you start a screen or component before opening one, read it first.

Before building any UI that shows the logo, metadata, icons or brand colors, read docs/brand.md.

shadcn/ui runs on Base UI (ADR 0015). Add a component from the root with `pnpm dlx shadcn@<version> add <name> -c apps/web`, choosing a CLI version older than pnpm's one-day minimum release age; then adapt it to the design system.

Every protected page and layout calls `requireSignedIn()` (`apps/web/src/lib/auth.ts`); `proxy.ts` only redirects signed-out visitors early (Clerk Core 3). Clerk's texts are tuned in `apps/web/src/lib/clerk.ts`.

## Git

- **Never** run a git command that changes the repository or the remote (`add`, `commit`, `push`, `pull`, `merge`, `rebase`, `reset`, `checkout`/`switch`, `branch`, `tag`, `stash`, opening PRs, etc.) unless the user explicitly asks for it or authorizes it.
- An authorization covers only the task it was given for. It doesn't carry over to later changes.
- Read-only commands (`status`, `diff`, `log`, `show`, `blame`) are allowed.
- When work is ready, propose the commit message and let the user decide.
- The user runs every git command. At the end of each phase, give the exact commands (add, commit with the attribution line, push), say whether to merge to `main` (yes or no, and what must happen first), and give the commands that start the next phase's branch from an updated `main`.
- Changes outside the phase (process rules, this file) go in their own commit on the same branch.

## This file

Update it, in the same change, when a lasting instruction, command or gotcha comes up. Keep it to about 50 lines, not counting the imported docs: constraints, commands and decisions only. History belongs in `docs/phase-log.md`, details in the docs and rules.
