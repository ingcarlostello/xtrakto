# Xtrakto — Roadmap

Single source of truth for **what** to build and **in which order**. **How** to write the code is defined by the project rules installed in this repository; they are not repeated here.

---

## 1. How to work with this roadmap

These instructions are for the coding agent (Claude Code, Cursor) and for the human reviewing its work.

**One phase at a time**

1. Start each phase by stating its id, its goal, the files you plan to create or change, and any open question.
2. If the phase is marked **[HUMAN]** or depends on a decision gate (section 4), stop and wait for the human before writing code.
3. Implement only what the phase asks. Don't anticipate later phases: no speculative abstractions and no dependencies the phase doesn't need. If work from a later phase turns out to be required, stop and propose a reordering.
4. Finish by running `pnpm turbo check-types lint test` (plus the `ml/` checks in Stage 14). Everything must pass.
5. Update this file: tick the phase in section 5 and add an entry at the end of the phase log (`docs/phase-log.md`) with what was done, deviations and follow-ups.
6. Stage the changes and propose a Conventional Commit message. Commit only after the human approves. Never push unless asked.
7. Stop and wait for "continue".

**Phase size:** a phase must fit in one reviewable commit. If its code outside tests grows beyond roughly 400 changed lines (fixtures, lockfiles and generated files don't count either), split it into sub-phases (2.4a, 2.4b…), update this file and ask for approval.

**Branches:** until CI exists (Phase 0.7), work on `main`. After that, one branch, one commit and one pull request per phase. Branch names follow `<type>/<phase>-<short-description>`, with the Conventional Commit type and the phase id: `docs/0.8-readme-adr`, `feat/1.2-money-minor-units`.

**Conflicts:** if this roadmap contradicts the project rules, the rules win. Point out the conflict and propose an update to this file.

**Outlined stages:** stages 8 to 16 are outlines. Before starting one, expand each of its phases into the same format as the detailed ones (goal, tasks, done when, commit) and get approval.

**Real data:** real files live only in git-ignored `fixtures/private/` folders. The agent may open them locally to learn a format (authorized by the human), but never commits, pastes into tracked files or logs real data; committed fixtures stay invented, and private tests print no content (Phase 2.8).

**Decisions:** when a phase makes a decision worth remembering, record it as an ADR in `docs/adr/`.

---

## 2. Product brief

**Xtrakto** turns a bank statement into a plain-language explanation of where the money went.

- **Users:** people in Colombia first (Bancolombia); more banks and countries later.
- **Language:** the UI is in Spanish (`es-CO`) with amounts in COP. Code and documentation are in English.
- **Key insight:** banks report total debits, but much of that is not spending. Xtrakto separates:
  - **Real spending:** purchases, bills, loan payments, cash withdrawals, transfers to other people.
  - **Money that only moved:** transfers between the user's own accounts, investments and credit card payments (the card's spending belongs to the card statement), in either direction: money back from the user's own Nequi or name is not income.
  - **Income.**
- On top of that: categories, recurring payments, fees such as the 4x1000 tax, plain-language explanations of cryptic lines ("Tu extracto, traducido") and, later, a chat to ask questions about the data.

**MVP (stages 0–7):** Bancolombia savings account; quarterly statement and movements export, both as spreadsheets; deterministic parsing with balance verification; rule-based categorization; summary, transactions, recurring payments and insights; authentication; private beta deployment.

**After the MVP:** LLM features (8), PDF (9), monthly use and email (10), unknown bank formats with an agent (11), credit cards (12), chat (13), own ML model (14), RAG (15), portfolio polish (16).

**Out of scope:** open banking connections, multiple currencies, a native mobile app, investment tracking.

**Portfolio goal:** demonstrate production work with LLMs — extraction with evals, PII handling, cost control, agents, RAG and a complete ML lifecycle — each backed by ADRs and measured results.

### Usage limits (free tier)

| Limit                                   | Value                           |
| --------------------------------------- | ------------------------------- |
| Statements processed per user per month | 10                              |
| File size                               | 10 MB                           |
| PDF pages                               | 30                              |
| Chat questions per user per day         | 30                              |
| API requests per user per minute        | 60                              |
| LLM cost per user per month             | USD 1                           |
| Platform LLM budget                     | Alert at 80%, hard stop at 100% |

---

## 3. Plan-specific decisions

These complement the project rules.

1. **Files are read in the browser.** The server receives the extracted content (spreadsheet rows or PDF text items), never the original file and never the PDF password. There is no file storage in the MVP.
2. **Extraction and parsers are isomorphic** and live in `@xtrakto/parsers`. The browser extracts the content and runs format detection to show a preview; the server re-runs detection and parsing, and its result is the authoritative one.
3. **Ingestion is asynchronous with Inngest.** The server action stores the extracted content in an `ingestion_jobs` row and sends an event that carries **IDs only** (Inngest stores and displays event payloads). The extracted content is deleted when the job finishes; a daily job deletes anything left after 24 hours.
4. **Deterministic first:** rules → own ML model (Stage 14) → LLM. The LLM never computes amounts.
5. **Data isolation:** all financial tables use forced Row-Level Security through a transaction-local `app.user_id` setting, in addition to filtering by `userId` in every query. The `users` table (identity mapping only, no financial data) can be read and added to freely; its Row-Level Security only limits deletion to the user's own row (ADR 0016).
6. **Third-party identifiers** (such as phone numbers in the `Referencia` column) are stored only as HMAC-SHA-256 with a secret key, plus their last 4 digits for display (design v8, Phase 5.5). A plain hash of a phone number can be reversed by brute force; 4 digits can't rebuild it.
7. **The account holder's name** is stored normalized on the account to detect transfers between the user's own accounts. It is never logged or sent to an LLM.
8. **Services:** Vercel (app and Inngest functions), Inngest Cloud, Clerk, Neon for PostgreSQL (chosen at gate 3.1, ADR 0013); later Langfuse, Sentry, PostHog and Resend. Domain: `xtrakto.site`, DNS managed at Hostinger.
9. **Development machine:** macOS on Intel (`darwin-x64`), Node 22 via nvm, pnpm 12.9.1. Some packages ship native binaries; if one has no `darwin-x64` build, stop and report instead of working around it. Node 22 reaches end of life in April 2027: plan the upgrade before then.
10. **TypeScript 6.0 across the monorepo.** TypeScript 7 has no JavaScript compiler API yet, so typescript-eslint (which supports TS `<6.1`) and the Next.js ESLint config can't use it. Move to TypeScript 7 when typescript-eslint supports it.

---

## 4. Decision gates

The human decides before the phase starts. The agent may propose options with trade-offs.

| Gate                | Phase | Options                                                                                                                                                                                               |
| ------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spreadsheet library | 2.2   | SheetJS from its official distribution (the `xlsx` package on the npm registry is outdated) or ExcelJS. Must work in Node and in a Web Worker.                                                        |
| PostgreSQL provider | 3.1   | Neon (recommended: serverless, database branches for previews) or Supabase.                                                                                                                           |
| Design direction    | 4.3   | Resolved: v8 (October 2026), v7 (the layout of v4 with the style of v6) adjusted after checking real Bancolombia files (`.claude/rules/design-system.md`); screenshots of every screen in `docs/ui/`. |
| LLM providers       | 8.1   | Primary and fallback provider.                                                                                                                                                                        |
| Credit card sample  | 12.1  | An anonymized card statement provided by the human.                                                                                                                                                   |
| Usury rate source   | 12.4  | Official publication confirmed by the human.                                                                                                                                                          |

---

## 5. Progress

**Stage 0 — Repository foundations**

- [x] 0.1 Audit the repository (read-only)
- [x] 0.2 Clean up the boilerplate
- [x] 0.3 Shared TypeScript configuration
- [x] 0.4 Shared ESLint configuration
- [x] 0.5 Testing setup
- [x] 0.6 Formatting, editor and ignore files
- [x] 0.7 [HUMAN] GitHub repository and CI
- [x] 0.8 README and ADR scaffolding
- [x] 0.9 ADRs for decisions already made

**Stage 1 — Domain core (`packages/core`)**

- [x] 1.1 Package scaffold, Result and AppError
- [x] 1.2 Money in minor units
- [x] 1.3 Dates: LocalDate and conversions
- [x] 1.4 Categories as a shared contract
- [x] 1.5a Base schemas and extracted content
- [x] 1.5b Parsed statement schemas
- [x] 1.6 PII redaction
- [x] 1.7 Identifier hashing

**Stage 2 — Spreadsheet extraction and parsers (`packages/parsers`)**

- [x] 2.1 Parser contract and registry
- [x] 2.2 Spreadsheet extraction (gate: library)
- [x] 2.3 Synthetic fixtures
- [x] 2.4a Quarterly statement header and summary
- [x] 2.4b Quarterly statement movements
- [x] 2.4c Quarterly statement parser and registry
- [x] 2.5 Statement reconciliation
- [x] 2.6 Bancolombia movements export parser
- [x] 2.7 Format detection
- [x] 2.8 [HUMAN] Private verification with real files

**Stage 3 — Database (`packages/db`)**

- [x] 3.1 [HUMAN] Database provider and local PostgreSQL
- [x] 3.2 Package scaffold and migration tooling
- [x] 3.3 Schema v1
- [x] 3.4 Row-Level Security and user context
- [x] 3.5 Persistence functions and dev seed

**Stage 4 — Web app foundations (`apps/web`)**

- [x] 4.1 Environment validation
- [x] 4.2 UI base: shadcn/ui and root layout
- [x] 4.3a [HUMAN] Design direction, tokens and base components
- [x] 4.3b Design system development page
- [x] 4.4 [HUMAN] Authentication with Clerk
- [x] 4.5 User lifecycle and data deletion
- [x] 4.6 App shell and empty states

**Stage 5 — First end-to-end slice: spreadsheet ingestion**

- [x] 5.1 Inngest setup
- [x] 5.2a Content minimization and synthetic XLSX files
- [x] 5.2b Extraction in a Web Worker
- [x] 5.3a Drop zone and pre-upload preview
- [x] 5.3b Accounts, formats and privacy panel
- [x] 5.4a Submit action and ingestion job
- [x] 5.4b Submit from the upload screen
- [x] 5.5a Persistence rules for ingestion
- [x] 5.5b Ingestion function
- [x] 5.5c Daily cleanup of stale jobs
- [x] 5.6a Status polling
- [x] 5.6b Upload result
- [x] 5.6c Uploaded files and "Encadenado"
- [x] 5.7a Movements by day _(after 16.0a to 16.0d, pulled forward by the human)_
- [x] 5.7b Period selector and account switch
- [x] 5.7c Search
- [x] 5.7d "Ver dónde no cuadra"
- [x] 5.8 Onboarding _(design v8)_

**Stage 6 — Deterministic insights**

- [x] 6.1a Rules from Appendix B
- [x] 6.1b Categorized movements
- [x] 6.2a Internal movement detection
- [x] 6.2b Kinds in Movimientos
- [x] 6.3a User rules
- [x] 6.3b Quick review: ask and answer
- [x] 6.3c Quick review: answered groups and the banner
- [x] 6.3d Nequi numbers
- [x] 6.3e "Lo que está en juego"
- [x] 6.3f Detail panel
- [x] 6.3g Corrections
- [x] 6.3h Your own accounts and undo
- [x] 6.4 Summary computations
- [x] 6.5 Recurring payments
- [x] 6.5b Recurring payments page _(design v8)_
- [x] 6.5c Recurring payments: what to expect _(design v8)_
- [x] 6.6 Insights ("Para revisar")
- [x] 6.7a Summary at a glance
- [x] 6.7b Your account card
- [x] 6.7c Balance and real spending, day by day
- [x] 6.7d Where it went and what to review
- [x] 6.7e Interest by month in Movimientos
- [x] 6.8a Categories page _(design v8)_
- [x] 6.8b A category's detail _(design v8)_
- [x] 6.8c A category's weeks and places _(design v8)_

**Stage 7 — First deployment (private beta)**

- [x] 7.1 [HUMAN] Domain xtrakto.site on Vercel
- [x] 7.2 [HUMAN] Production services
- [x] 7.3 Error monitoring with Sentry
- [x] 7.4a Consent and PostHog, through an allowlist
- [x] 7.4b Upload and correction events
- [x] 7.5 Data flow document and privacy page
- [x] 7.6 Export my data
- [x] 7.7a Profile in the dock _(design v8)_
- [x] 7.7b Your account, plan and session _(design v8)_
- [ ] 7.7c How the bank writes you and what's yours _(design v8)_
- [ ] 7.8 Sample data to explore _(design v8)_

**Stage 8 — LLM layer** _(outline)_

- [ ] 8.1 [HUMAN] AI module with primary and fallback providers
- [ ] 8.2 Versioned prompts and Langfuse tracing
- [ ] 8.3 Usage tracking and limits
- [ ] 8.4 Evaluation harness (`packages/evals`)
- [ ] 8.5 LLM categorization fallback
- [ ] 8.6 "Tu extracto, traducido"

**Stage 9 — PDF statements** _(outline)_

- [ ] 9.1 Browser PDF extraction with password
- [ ] 9.2 Layout reconstruction
- [ ] 9.3 Quarterly statement PDF parser
- [ ] 9.3b Movements export PDF parser _(design v8)_
- [ ] 9.4 PDF edge cases

**Stage 10 — Monthly use and retention** _(outline)_

- [ ] 10.1 Cross-format deduplication
- [ ] 10.2 Coverage and gaps
- [ ] 10.3 Optional current balance
- [ ] 10.4 [HUMAN] Email with Resend and monthly reminder
- [ ] 10.5 Monthly summary email

**Stage 11 — Unknown formats: ingestion agent** _(outline)_

- [ ] 11.1 Format fingerprints and saved mappings
- [ ] 11.2 LLM column-mapping proposal
- [ ] 11.3 Mapping confirmation screen
- [ ] 11.4 Ingestion agent with LangGraph.js
- [ ] 11.5 Agent evals

**Stage 12 — Credit cards** _(outline)_

- [ ] 12.1 [HUMAN] Card statement sample and phase refinement
- [ ] 12.2 Card statement parser
- [ ] 12.3 Account and card reconciliation
- [ ] 12.4 Usury rate pipeline and check
- [ ] 12.5 Card insights

**Stage 13 — "Pregúntale a tu extracto": chat agent** _(outline)_

- [ ] 13.1 Typed data tools
- [ ] 13.2 Chat agent with LangGraph.js
- [ ] 13.3 Chat UI with streaming and cited transactions
- [ ] 13.4 Prompt-injection hardening
- [ ] 13.5 Chat evals
- [ ] 13.6 (Optional) Analysis sandbox with Pyodide

**Stage 14 — Machine learning (`ml/`)** _(outline)_

- [ ] 14.1 `ml/` scaffold
- [ ] 14.2 Anonymized labeled dataset
- [ ] 14.3 Baseline and split by statement
- [ ] 14.4 Training with MLflow
- [ ] 14.5 Evaluation report
- [ ] 14.6 ONNX export (`packages/models`)
- [ ] 14.7 Inference in Node and parity test
- [ ] 14.8 Anomaly detection

**Stage 15 — RAG and vector search** _(outline)_

- [ ] 15.1 Public sources corpus
- [ ] 15.2 Chunking, embeddings and pgvector
- [ ] 15.3 Retrieval evals
- [ ] 15.4 Pinecone implementation and benchmark
- [ ] 15.5 Cited answers in the chat

**Stage 16 — Portfolio polish** _(outline)_

- [x] 16.0a Promo video _(pulled forward, before 5.7a)_
- [x] 16.0b Waitlist entries and join form _(pulled forward, before 5.7a)_
- [x] 16.0c Waitlist landing page _(pulled forward, before 5.7a)_
- [x] 16.0d Waitlist-only deployment _(pulled forward, before 5.7a)_
- [ ] 16.1 Landing page
- [ ] 16.2 Final README with architecture and results
- [ ] 16.3 [HUMAN] Technical write-up and demo video
- [ ] 16.4 Public launch checklist

---

## 6. Stages and phases

Every phase's "Done when" implicitly includes: `pnpm turbo check-types lint test` passes, the progress checklist and the phase log (`docs/phase-log.md`) are updated.

### Stage 0 — Repository foundations

#### 0.1 Audit the repository (read-only)

**Goal:** know the real starting point before changing anything.

**Tasks**

- List the workspace packages with their names, scripts and dependencies.
- Report the versions of Node, pnpm, Turborepo, Next.js, React, TypeScript, Tailwind, ESLint and Vitest (if present).
- Check: does `apps/docs` exist? `packages/ui`? Is `apps/web` an App Router app with `src/` and Tailwind? Does `packages/parsers` exist with `normalizeDescription` and its tests? Where are the project rules installed?
- Run `pnpm install` and `pnpm turbo check-types lint test build` and report the results.
- The install log showed TypeScript 7.x. Check that the tooling in use (typescript-eslint, Next.js type checking, Vitest) supports it. If something doesn't, report the options instead of working around it.

**Done when:** a report in the chat with findings and proposed adjustments to phases 0.2 to 0.6. No files changed.

**Commit:** none.

#### 0.2 Clean up the boilerplate

**Tasks**

- Remove template leftovers and every reference to them: `packages/ui` (there is no `apps/docs`), `apps/web/README.md`, the unused `public/*.svg` files and the empty `.npmrc`. Replace the template `README.md` with a stub until Phase 0.8.
- Remove the nested workspace inside `apps/web` (its `pnpm-lock.yaml`, `pnpm-workspace.yaml` and `packageManager`): the root owns the lockfile and the pnpm settings.
- In the root `pnpm-workspace.yaml`, replace the `allowBuilds` placeholder, which makes `pnpm install` fail with `ERR_PNPM_IGNORED_BUILDS`, with `sharp: false` and `unrs-resolver: false` (both ship prebuilt binaries).
- Keep the root package named `xtrakto` and `packageManager` pinned to the installed pnpm version (the template's version has no `darwin-x64` binary).
- Rename the configuration packages to `@xtrakto/typescript-config` and `@xtrakto/eslint-config` and update every reference.
- Replace the default home page with a minimal placeholder in Spanish.
- Root scripts: `dev`, `build`, `lint`, `check-types`, `test`, `format`. Add a minimal `test` task to `turbo.json` so `pnpm turbo check-types lint test` runs from this phase on (Phase 0.5 completes it).
- No `transpilePackages`: Next.js 16.3 transpiles workspace packages automatically with the App Router. Check this when `apps/web` imports its first internal package.

**Done when:** `pnpm install --frozen-lockfile` passes with a single lockfile; `pnpm dev` serves only `apps/web`; `git grep "@repo/" -- ':!docs/ROADMAP.md'` returns nothing.

**Commit:** `chore: clean up monorepo boilerplate`

#### 0.3 Shared TypeScript configuration

**Tasks**

- `typescript` pinned to `6.0.3` at the root and in every package (decision 10); `@types/node` on `^22`.
- `@xtrakto/typescript-config` with a base config for packages and a Next.js config that `apps/web` extends. Packages export TypeScript source consumed by Next.js and Vitest, so the base config uses `moduleResolution: "Bundler"` and `noEmit`. Remove `react-library.json`.
- `strict` and `noUncheckedIndexedAccess` enabled (parsers index into rows constantly; this catches missing cells).
- TypeScript 6 changed some defaults: check the effective config with `tsc --showConfig` and set `types` explicitly.
- Every package with TypeScript code has a `check-types` script. In `apps/web` it is `next typegen && tsc --noEmit`, because route types such as `LayoutProps` are generated and CI has no previous build.

**Done when:** check-types passes everywhere; an unchecked index access is reported as an error (verify locally, don't commit the test case).

**Commit:** `chore: shared strict TypeScript configuration`

#### 0.4 Shared ESLint configuration

**Tasks**

- ESLint 9 across the monorepo: the plugins bundled in `eslint-config-next` (react, import, jsx-a11y) don't support ESLint 10 yet.
- Flat config in `@xtrakto/eslint-config` with presets for packages and for the Next.js app (built on `eslint-config-next`). typescript-eslint replaces the template's Babel parser. Remove `eslint-plugin-only-warn`, which turns every error into a warning, and the unused `react-internal` preset.
- Automate what the project rules allow:
  - Errors: `any`, `enum` (via `no-restricted-syntax`), deep imports into another package (`@xtrakto/*/src/**`).
  - Warnings: `max-lines` 300 (skipping blank lines and comments), `max-lines-per-function` 40, `max-depth` 3, `max-params` 3, `no-console`.
  - Overrides relaxing size rules for tests, fixtures and generated files.

**Done when:** lint passes; each rule triggers on a sample violation, with `any` and `enum` reported as errors (verify locally, don't commit it).

**Commit:** `chore: shared ESLint configuration with project rules`

#### 0.5 Testing setup

**Tasks**

- Vitest in `apps/web`, the only TypeScript package with code so far, with its own config and `test` script; `test` task in `turbo.json` with correct inputs and coverage as output. Packages created later (1.1, 2.1, 3.2) add Vitest the same way.
- In `apps/web`: Node environment by default, and an alias that replaces `server-only` with an empty module in tests (the real package throws outside React Server Components). `passWithNoTests` until the app has its first test.
- Coverage reporter configured, without thresholds yet.

**Done when:** `pnpm turbo test` from the root runs the app's Vitest setup.

**Commit:** `chore: Vitest setup`

#### 0.6 Formatting, editor and ignore files

**Tasks**

- Prettier (single config, with a `.prettierignore` for lockfiles and build output) with `format` and `format:check` scripts; `.editorconfig`; `.nvmrc` with Node 22; `engines` in the root `package.json` set to `^22.12.0` (it says `>=24` today; Vitest needs 22.12 or later).
- `.gitignore`: `.env*` except `.env.example`, `**/fixtures/private/`, `ml/data/`, `ml/artifacts/`, coverage output, `.turbo`. Today's `fixtures/private/` pattern only matches at the root, so `packages/parsers/fixtures/private/` is **not** ignored. Merge `apps/web/.gitignore` into the root file.
- Root `.env.example`, documented and empty for now.

**Done when:** `pnpm format:check` passes; `git check-ignore -v` confirms that `packages/parsers/fixtures/private/test.xlsx` and `.env.production` would be ignored.

**Commit:** `chore: formatting, editor config and ignore rules`

#### 0.7 [HUMAN] GitHub repository and CI

**Human:** create a **private** GitHub repository named `xtrakto`, add it as the remote and push `main`.

**Tasks**

- `.github/workflows/ci.yml` on pull requests and pushes to `main`: pnpm version from `packageManager`, Node from `.nvmrc`, `pnpm install --frozen-lockfile`, `pnpm turbo check-types lint test`, `pnpm format:check`. Cancel outdated runs of the same branch.

**Done when:** CI passes on a pull request.

**Commit:** `ci: type check, lint, test and format on pull requests`

#### 0.8 README and ADR scaffolding

**Tasks**

- `README.md`: what Xtrakto is (two or three sentences), status, stack, monorepo layout, local setup, scripts, links to `docs/`.
- `docs/adr/README.md` (index and how to write an ADR) and `docs/adr/0000-template.md` (context, decision, alternatives considered, consequences).

**Commit:** `docs: README and ADR template`

#### 0.9 ADRs for decisions already made

**Tasks:** short ADRs (one page at most), based on section 3 of this roadmap and the project rules:

- 0001 Monorepo with pnpm workspaces and Turborepo.
- 0002 TypeScript on Node for the backend (Node 22, end of life in April 2027); Python only for ML training.
- 0003 PostgreSQL with Drizzle (alternative considered: Convex).
- 0004 Clerk for authentication.
- 0005 Inngest for background work (alternative considered: pg-boss, which needs an always-on worker that Vercel doesn't provide).
- 0006 Money as integer minor units.
- 0007 Transaction dates as `LocalDate`.
- 0008 Files are read in the browser; the server receives extracted content only.
- 0009 Deterministic parsing first, LLM as a fallback.
- 0010 TypeScript 6.0 until typescript-eslint supports TypeScript 7 (decision 10).

**Commit:** `docs(adr): record initial architecture decisions`

---

### Stage 1 — Domain core (`packages/core`)

#### 1.1 Package scaffold, Result and AppError

**Tasks**

- Create `@xtrakto/core`, the first internal package: public API only in `src/index.ts`, shared TypeScript and ESLint configs, Vitest. Later packages copy its structure.
- `Result<T, E>` with `ok()` and `err()` helpers.
- `AppError` with a `code` from an `as const` object (`INVALID_INPUT`, `UNKNOWN_FORMAT`, `PARSE_FAILED`, `BALANCE_MISMATCH`, `LIMIT_REACHED`, `NOT_FOUND`, `UNAUTHORIZED`) and optional `details` that never contain PII.

**Done when:** helpers are tested; the package's API is exported only from `src/index.ts`.

**Commit:** `feat(core): package scaffold with Result and AppError`

#### 1.2 Money in minor units

**Tasks**

- Branded `AmountMinor` type and a `Currency` type (ISO 4217, starting with `COP`).
- `parseAmountText(text)` for statement text amounts: `"1,234.56"`, `"-15,000.00"`, `".00"`, `"12.34"`, `"9,876,543"`. Returns a `Result`.
- `amountFromNumber(n)` for numeric spreadsheet cells (`-50000`, `12.34`) without floating-point drift.
- `sumAmounts`, and `formatAmount(amount, currency, locale = "es-CO")` with `Intl.NumberFormat`.

**Done when:** table-driven tests cover negatives, zero, `".00"`, values up to 10^13 COP, invalid strings and floating-point traps.

**Commit:** `feat(core): money in integer minor units`

#### 1.3 Dates: LocalDate and conversions

**Tasks**

- Branded `LocalDate` (`"YYYY-MM-DD"`) with comparison helpers; time zones via `@date-fns/tz`.
- `localDateFromInstant(instant, timeZone)`.
- `localDateFromExcelSerial(serial, { serialTimeZone, targetTimeZone })` for the Excel 1900 date system. Each parser declares how its bank stores dates (Bancolombia's movements export stores local midnight as 05:00 UTC).
- `parseSlashDate("2026/06/30")`.
- `inferDayMonthDate("1/07", period)`: the only date inside the statement period with that day and month; an error if there is none. Must handle periods that cross from December to January.

**Done when:** tests cover 05:00 UTC → same day in Bogotá, year rollover, leap years and invalid input.

**Commit:** `feat(core): LocalDate and date conversions`

#### 1.4 Categories as a shared contract

**Tasks**

- `packages/core/categories.json` as the single source of truth (Python reads it in Stage 14). Each category: `id` (snake_case), `labelEs`, `kind` (`spending` | `income` | `internal`).
- Initial set:
  - **spending:** `groceries`, `restaurants`, `transport`, `utilities`, `housing`, `health`, `education`, `entertainment`, `shopping`, `subscriptions`, `loan_payment`, `transfers_to_people`, `digital_wallet`, `cash_withdrawal`, `taxes_and_fees`, `other_spending`
  - **income:** `income_transfer`, `interest`, `deposit`, `refund`, `other_income`
  - **internal:** `own_account_transfer`, `credit_card_payment`, `investment`
- A small script generates `categories.constants.ts` (with a "generated, do not edit" header) so TypeScript gets literal types (`CategoryId`). A test fails if the generated file is out of date.

**Done when:** tests validate the JSON (unique ids, valid kinds) and the freshness of the generated file.

**Commit:** `feat(core): spending categories as a shared contract`

#### 1.5a Base schemas and extracted content

Phase 1.5 was split in two (about 500 changed lines), with the human's approval.

**Tasks:** Zod schemas with inferred types:

- Type guards `isLocalDate` and `isAmountMinor`, and the schemas `localDateSchema`, `amountMinorSchema`, `currencySchema` and `periodSchema` (`from` ≤ `to`). They produce the branded types from phases 1.2 and 1.3.
- `ExtractedContent`, a discriminated union:
  - `spreadsheet`: sheets → rows → cells. A cell is `string | number | null | { excelSerial: number }` (date cells are flagged, never converted to JavaScript `Date`).
  - `pdf`: pages → text items with `str`, `x`, `y`, `width`, `height` (used in Stage 9, defined now).
- Size bounds (sheets, rows, cells per row, text lengths, pages, items per page) to reject oversized payloads early.

**Done when:** schemas are tested with valid and invalid examples, including each size bound.

**Commit:** `feat(core): base schemas and extracted content`

#### 1.5b Parsed statement schemas

**Tasks:** Zod schemas with inferred types:

- `ParsedTransaction`: `date`, `descriptionRaw`, `descriptionNormalized`, `amountMinor`, optional `balanceAfterMinor`, optional `referenceRaw` and `referenceKind`, `sourceRow`.
- `ParsedStatement`: `bankId`, `formatId`, `accountType` (`savings` | `credit_card`), optional `accountLast4`, `currency`, `period` and its source (`statement` | `rows`), optional opening and closing balances, optional totals (credits, debits, interest, withholding, average balance), optional `holderName`, `transactions`, `warnings`.
- Size bounds for transactions, warnings and text fields.

**Done when:** schemas are tested with valid and invalid examples.

**Commit:** `feat(core): parsed statement schemas`

#### 1.6 PII redaction

**Tasks**

- `redactPii(text, { knownNames })` replaces Colombian mobile numbers, digit runs of 6 or more (IDs, accounts, contracts), emails, the account holder's name, and the name after person-transfer prefixes (`TRANSF A`, `TRANSF DE`, `PAGO LLAVE`) with placeholders (`[PHONE]`, `[NUMBER]`, `[EMAIL]`, `[NAME]`).
- Keeps merchant names (`COMPRA EN …`, `PAGO QR …`): categorization needs them.
- Document known limitations in the code.

**Done when:** table-driven tests with realistic synthetic descriptions pass, including truncated names.

**Commit:** `feat(core): PII redaction`

#### 1.7 Identifier hashing

**Tasks**

- `hashIdentifier(value, key)`: HMAC-SHA-256 with Web Crypto, after normalizing the value (digits only for phone numbers).
- The key is passed by the caller; `apps/web` will read it from `IDENTIFIER_HASH_KEY` (at least 32 random bytes). Document it in `.env.example`.

**Done when:** fixed test vectors pass; the same value with different keys gives different hashes.

**Commit:** `feat(core): keyed hashing for third-party identifiers`

---

### Stage 2 — Spreadsheet extraction and parsers (`packages/parsers`)

#### 2.1 Parser contract and registry

**Tasks**

- Create `@xtrakto/parsers` with the same structure as `@xtrakto/core`.
- `BankParser` as defined in the project rules, with `id`, `bankId`, `canParse(content)` and `parse(content)` → `Result<ParsedStatement>`.
- A registry and `findParser(content)`.
- Create and export `normalizeDescription` (trim and collapse whitespace), with tests.

**Done when:** a test-only parser proves the registry; the public API is exported only from `src/index.ts`; `@xtrakto/parsers` imports from `@xtrakto/core` through its public API.

**Commit:** `feat(parsers): parser contract and registry`

#### 2.2 Spreadsheet extraction — gate: library

**Tasks**

- Propose SheetJS or ExcelJS with trade-offs; record the decision in an ADR.
- `extractSpreadsheet(bytes)` → `ExtractedContent` for XLSX and CSV. Raw values only: no styles, no formulas evaluated, date cells as `{ excelSerial }`.
- Must run in Node and in a Web Worker (it will run in the browser in Stage 5).
- A script generates small synthetic XLSX files to test extraction.

**Done when:** extracting each synthetic XLSX produces the expected `ExtractedContent`; date cells come out as serials, never as `Date` objects.

**Commit:** `feat(parsers): spreadsheet extraction`

#### 2.3 Synthetic fixtures

**Tasks**

- `packages/parsers/fixtures/` with `ExtractedContent` JSON reproducing the formats in Appendix A, with invented names and numbers only:
  - `quarterly-basic` (about 30 rows), `quarterly-year-rollover` (December to January), `quarterly-repeated-header`, `quarterly-broken-balance` (one wrong amount), `quarterly-large` (about 450 rows, from a seeded script).
  - `movements-basic` (newest first, 05:00 serial dates, phone references) and `movements-overlap` (same month as a quarterly fixture, with interest rows dated one day later).
- `fixtures/README.md` explaining each fixture and that real data is forbidden in this folder.

**Done when:** every fixture validates against `ExtractedContent`.

**Commit:** `test(parsers): synthetic Bancolombia fixtures`

#### 2.4a Quarterly statement header and summary

Phase 2.4 was split in three (estimated at about 990 changed lines), with the human's approval.

**Tasks**

- Implement the blocks of Appendix A.1 before the movements. Find blocks by their labels and columns by their header names, not by fixed positions.
- Read the holder name, the period, the account type (only `CUENTA DE AHORROS`), the last 4 digits of the account, the balances and the totals. `TOTAL CARGOS` keeps its printed, positive sign.
- Never read the address or the city, and never output the full account number.
- A missing block, column or value, an invalid amount or date, or another account type returns `PARSE_FAILED` with the reason, block and column, never the cell's text.

**Done when:** the quarterly fixtures give the expected header; each failure has its own test.

**Commit:** `feat(parsers): quarterly statement header and summary`

#### 2.4b Quarterly statement movements

**Tasks**

- Read movements until `FIN ESTADO DE CUENTA`, skipping blank rows and the blocks each page repeats; any other non-movement row gives an `UNEXPECTED_ROW` warning.
- Amounts with `parseAmountText`, dates with `inferDayMonthDate`, descriptions normalized (keeping the raw text too).
- In descriptions, runs of 6 or more digits keep only their last 4, with the same length (`INTERES INV VIRT *******7525`). Record the decision in an ADR.
- A movement that can't be read, a damaged page header or a missing end marker returns `PARSE_FAILED` with the row.

**Done when:** the quarterly fixtures' movements parse; each movement quirk in Appendix A.1 has its own test.

**Commit:** `feat(parsers): quarterly statement movements`

#### 2.4c Quarterly statement parser and registry

**Tasks**

- `bancolombiaQuarterlyParser` (`bancolombia-savings-quarterly`) joins the header and the movements and validates its output with `parsedStatementSchema`. Its `canParse` checks the exact movements header; Phase 2.7 makes it tolerant.
- A default registry, with a ready `findParser` exported by the package.

**Done when:** all quarterly fixtures produce the expected output; `findParser` finds the parser for them and returns `UNKNOWN_FORMAT` for other content.

**Commit:** `feat(parsers): Bancolombia quarterly statement parser`

#### 2.5 Statement reconciliation

**Tasks**

- `reconcile(statement)` → `{ balanceVerified, issues }` with exact integer comparisons:
  - Each row: previous balance + amount = balance.
  - Opening balance + sum of amounts = closing balance.
  - Sum of credits = total credits; sum of debits = total debits.
- A statement without balances returns `balanceVerified: false` with reason `NO_BALANCE_DATA`; that is not an error.

**Done when:** valid fixtures verify; the broken fixture reports the exact row; each check has its own test.

**Commit:** `feat(parsers): statement reconciliation`

#### 2.6 Bancolombia movements export parser

**Tasks**

- Implement Appendix A.2: header row, Excel serial dates converted from UTC to `America/Bogota`, numeric amounts.
- Keep `Referencia` raw (it is hashed at persistence) with a detected `referenceKind`: `phone` | `atm` | `code` | `none`.
- Rows come newest first; output them by ascending date, in a stable order.
- This format has no account number and no balance: `accountLast4` is undefined, the period comes from the rows, and reconciliation returns `NO_BALANCE_DATA`.

**Done when:** fixtures parse; there are tests for date conversion, ordering and reference kinds.

**Commit:** `feat(parsers): Bancolombia movements export parser`

#### 2.7 Format detection

**Tasks**

- `canParse` for both parsers using header signatures, ignoring accents, case and extra whitespace.
- Unknown content returns `UNKNOWN_FORMAT` (handled by the ingestion agent in Stage 11).

**Done when:** each fixture is detected by exactly one parser; unrelated spreadsheets are reported as unknown.

**Commit:** `feat(parsers): format detection`

#### 2.8 [HUMAN] Private verification with real files

**Human:** confirm that `packages/parsers/fixtures/private/` is git-ignored, then copy the real exports (quarterly XLSX and movements XLSX) into it.

**Tasks**

- `*.private.test.ts` files and a `test:private` script, excluded from `test` and from CI; tests skip themselves if the files are missing.
- Assert only counts and booleans, and print no descriptions or amounts:
  - The quarterly file parses and reconciles.
  - The movements file parses.
  - For the overlapping month, both files contain the same movements (same normalized descriptions and amounts), and the only date differences are `ABONO INTERESES AHORROS` rows shifted by one day.

**Done when:** private tests pass locally and `pnpm turbo test` doesn't run them.

**Commit:** `test(parsers): private verification against real exports`

---

### Stage 3 — Database (`packages/db`)

#### 3.1 [HUMAN] Database provider and local PostgreSQL

**Human:** choose the provider (gate) and create the project.

**Tasks**

- `docker-compose.yml` with PostgreSQL and pgvector, same major version as the hosted database.
- `.env.example`: `DATABASE_URL` (application role) and `DATABASE_MIGRATION_URL` (owner role).
- Local setup documented in the README.

**Done when:** `docker compose up` gives a database the app can connect to.

**Commit:** `chore(db): local PostgreSQL with Docker Compose`

#### 3.2 Package scaffold and migration tooling

**Tasks**

- `@xtrakto/db` with Drizzle ORM and drizzle-kit; a connection factory using a Node driver suited to serverless and the provider's pooled connection string.
- Scripts: `db:generate`, `db:migrate`, `db:studio`.
- Integration tests run against the local test database (`TEST_DATABASE_URL`, `TEST_DATABASE_MIGRATION_URL`). They are skipped when those aren't set and fail when they are but the database is down. CI always runs them, with the database from `docker compose up --wait`.

**Commit:** `feat(db): package scaffold and migration tooling`

#### 3.3 Schema v1

**Tasks:** tables (snake_case columns, `bigint` in number mode for amounts, `date` for transaction dates, `timestamptz` for instants):

- `users`: id, `clerk_user_id` (unique), created_at.
- `accounts`: id, user_id, bank_id, account_type, last4 (nullable), currency, display_name, holder_name_normalized (nullable), created_at. Unique on (user_id, bank_id, account_type, last4).
- `statements`: id, user_id, account_id, format_id, period_from, period_to, opening and closing balances (nullable), totals (nullable), balance_verified, created_at.
- `transactions`: id, user_id, account_id, statement_id, date, description_raw, description_normalized, amount_minor, balance_after_minor (nullable), reference_hash (nullable), reference_kind (nullable), category_id (nullable), category_source (nullable: `rule` | `model` | `llm` | `user`), kind (nullable), fingerprint, created_at. Unique on (account_id, fingerprint); indexes on (user_id, date) and (account_id, date).
- `ingestion_jobs`: id, user_id, account_id (nullable), status, step, format_id (nullable), error_code (nullable), extracted_content (jsonb, nullable, temporary), stats (jsonb, counts only), created_at, updated_at.

**Done when:** the first migration applies cleanly on an empty database.

**Commit:** `feat(db): schema v1`

#### 3.4 Row-Level Security and user context

**Tasks**

- Enable and **force** RLS on every table except `users`. Policies compare `user_id` with `current_setting('app.user_id', true)`.
- A dedicated application role without `BYPASSRLS` that doesn't own the tables; migrations run with the owner role.
- `withUserContext(db, userId, fn)` opens a transaction and runs `set_config('app.user_id', userId, true)` (transaction-local, required with a transaction-mode pool).

**Done when:** integration tests prove that user A cannot read or write user B's rows, and that queries without a user context return no rows.

**Commit:** `feat(db): row-level security and user context`

#### 3.5 Persistence functions and dev seed

**Tasks**

- `saveStatement(tx, input)`: inserts the statement and its transactions idempotently (`ON CONFLICT DO NOTHING` on the fingerprint) and returns inserted and skipped counts.
- Fingerprint v1: date, normalized description, amount, balance after (if any) and the occurrence index among identical rows. Cross-format deduplication comes in Stage 10.
- `listTransactions(tx, filter)` with period, account and pagination.
- `pnpm db:seed`: loads the synthetic fixtures for a development user, through the same functions.

**Done when:** saving the same statement twice inserts nothing the second time; tests cover filters and pagination.

**Commit:** `feat(db): persistence functions and dev seed`

---

### Stage 4 — Web app foundations (`apps/web`)

#### 4.1 Environment validation

**Tasks**

- `lib/env.ts` with a Zod schema for the server variables; the app fails to start if one is missing or invalid. Public variables that a library reads itself (Clerk's publishable key, Phase 4.4) are validated there too; a client schema comes when the app's own browser code reads one.
- The app reads the root `.env.local`, shared with drizzle-kit, Vitest and the seed.
- `.env.example` updated.

**Commit:** `feat(web): validated environment variables`

#### 4.2 UI base: shadcn/ui and root layout

**Tasks**

- Initialize shadcn/ui on Base UI (ADR 0015); root layout with `lang="es"`, metadata and the app name.
- The brand decided in `docs/brand.md` arrives now: Outfit and Manrope, the `Logo` component, the web manifest. The component tokens keep shadcn's neutral defaults until Phase 4.3.

**Commit:** `feat(web): shadcn/ui and root layout`

#### 4.3a [HUMAN] Design direction, tokens and base components

Phase 4.3 was split in two (about 650 changed lines), with the human's approval.

**Human:** choose the design version (gate) and share screenshots. Done: v7, with screenshots in `docs/ui/`.

**Tasks**

- Translate the design into Tailwind theme tokens (colors, radii, typography, spacing); `.claude/rules/design-system.md` stays their only documentation.
- Adapt the base components needed by the app (card, button, badge). The KPI tile is built with the summary page (6.7), its first consumer.

**Done when:** every text pair meets WCAG AA.

**Commit:** `feat(web): design tokens and base components`

#### 4.3b Design system development page

**Tasks**

- A development-only page shows the tokens and the base components.

**Done when:** the development page matches the reference in `docs/ui/`, at desktop and phone widths.

**Commit:** `feat(web): design system development page`

#### 4.4 [HUMAN] Authentication with Clerk

**Human:** create the Clerk application and add the development keys to `.env.local`.

**Tasks**

- `@clerk/nextjs` with Spanish localization; sign-in and sign-up pages.
- Protect every app route except the public ones. Clerk's middleware goes in `proxy.ts` (Next.js 16) and only redirects signed-out visitors early; every protected page and layout checks the session itself (`requireSignedIn()`), as Clerk Core 3 recommends.

**Done when:** an anonymous visitor is redirected to sign-in; a signed-in user reaches the app.

**Commit:** `feat(web): authentication with Clerk`

#### 4.5 User lifecycle and data deletion

**Tasks**

- `deleteAllUserData` in `@xtrakto/db`, with Row-Level Security on `users` so that a user can delete only their own row (ADR 0016). `getCurrentUserId()` moves to 5.4, its first consumer.
- Clerk webhook route for `user.deleted`, verifying the signature, that deletes all the user's data. The endpoint is registered in Clerk in Phase 7.2.
- "Delete my account and data" action in settings.

**Done when:** tests prove deletion removes every row belonging to the user and nothing else.

**Commit:** `feat(web): user lifecycle and data deletion`

#### 4.6 App shell and empty states

**Tasks**

- Layout following the chosen design: navigation with Resumen, Movimientos, Pagos fijos and Subir extracto (labeled "Subir" in the dock, as in the design); the settings in the avatar's menu.
- Empty states that invite the user to upload a statement.
- Server Components, except the two parts that need the browser: the active navigation item (`usePathname`) and Clerk's avatar menu.

**Done when:** every route renders its empty state; navigation works with the keyboard.

**Commit:** `feat(web): app shell and empty states`

---

### Stage 5 — First end-to-end slice: spreadsheet ingestion

Planned with the human on 2026-10-11 and split into 17 sub-phases (about 5,300 lines of code), with these decisions:

- **Only what works today.** Screens show the Excel files of a Bancolombia savings account and nothing a later stage brings (PDF, other banks, sample data, credit cards, the coverage timeline, "Año" in the period selector, categories, "Tu extracto, traducido", the chat). Copy is true today.
- **Minimized content.** The browser sends only what the parser reads, and the server minimizes again before storing: no address, city, branch or suggested credit line; only the account's last 4 digits; long numbers in descriptions masked. References travel raw only so the server can hash them, and are deleted when the job ends (24 hours at most). File names never leave the browser.
- **Two Inngest steps that carry ids only.** `claim` and `ingest` (one transaction) instead of one step per stage, because Inngest stores and shows step outputs, function results and errors; errors are sanitized. The event carries the job and user ids: forced Row-Level Security needs the user to load the job.
- **The verified quarterly statement wins.** On the days a verified quarterly statement covers, the other format's movements are stored hidden and never counted, whichever file arrives first; 10.1 later matches them and carries their references over. A quarterly statement that doesn't reconcile hides nothing, counts nowhere and shows only in "Ver dónde no cuadra". Another version of a period replaces an unverified statement; a verified one is never replaced.
- **"Encadenado"** is built in 5.6c; 10.2 keeps the coverage timeline and the missing periods. **The detail panel** of `v8-03` moves to 6.3, which edits kind and category from it.
- **Local Inngest** runs as a Docker Compose service next to PostgreSQL; CI starts only PostgreSQL and also builds the app.
- **Checks.** The agent checks screens only with synthetic files, in an account without real data. Real files go into a throwaway Clerk account that the human deletes afterwards; the agent prints counts only.

#### 5.1 Inngest setup

**Tasks**

- `inngest` in `apps/web`: a client, the route handler `/api/inngest` (public in the proxy: in Cloud mode the SDK verifies Inngest's signature) and a test function.
- Environment: `INNGEST_DEV` locally (version 4 of the SDK defaults to Cloud mode); the signing and event keys required without it; `INNGEST_DEV` refused on Vercel, because dev mode skips signature checks.
- The Inngest Dev Server as a pinned Docker Compose service. CI starts only PostgreSQL and builds the app (`next build`), so bundling errors fail the pull request.
- Document how to run it.

**Done when:** the test function runs from the local Dev Server; the environment rules are tested.

**Commit:** `feat(web): Inngest setup`

#### 5.2a Content minimization and synthetic XLSX files

Phase 5.2 was split in two, with the human's approval.

**Tasks**

- `BankParser.minimize(content)`: pure and idempotent, keeps row positions, and `parse(minimize(c))` equals `parse(c)`. It keeps only the cells the parser reads, in every block a page repeats: no address, city, branch, suggested credit line or sheet name; the account number becomes its last 4 digits; long numbers in descriptions are masked (ADR 0012); references stay raw.
- A writer that turns every fixture into a real XLSX, and a script that generates git-ignored files for manual checks, including invalid files and one of about 10 MB.
- An ADR for minimizing before sending.

**Done when:** parity, idempotency and the absence of personal data hold for every fixture and every private file (counts only).

**Commit:** `feat(parsers): minimize extracted content per format`

#### 5.2b Extraction in a Web Worker

**Tasks**

- One Web Worker per file (at most 3 at a time) runs extraction, detection, minimization and the preview parse, with progress by stage and cancellation, so the interface doesn't freeze. It posts only the minimized content and a preview (bank, format, period, number of movements), never the file name or the movements.
- A byte cap on the serialized content, under the request limit (Vercel Functions accept request bodies up to 4.5 MB).
- The file never leaves the browser.

**Done when:** a 10 MB spreadsheet is extracted without blocking the page; the worker's message handling is tested; a production build loads the worker from the same origin.

**Commit:** `feat(web): spreadsheet extraction in a Web Worker`

#### 5.3a Drop zone and pre-upload preview

Phase 5.3 was split in two, with the human's approval.

**Tasks**

- The upload screen of design v8 (`docs/ui/v8-07`), limited to what works today: a drop zone for one or several files, type and size validation (`.xlsx`, 10 MB per file), and a row per file with its local preview (bank, format, period, number of movements) or its problem in plain Spanish (`v8-13`).
- v8 doesn't draw the moment between choosing and sending: it is built from v8's pieces with a "Subir N archivos" button, disabled until 5.4b, and shown to the human before closing the phase.
- Design system: the drop zone and the pre-upload file row.

**Done when:** each synthetic XLSX shows the right preview; invalid files show a clear message.

**Commit:** `feat(web): upload drop zone with local preview`

#### 5.3b Accounts, formats and privacy panel

**Tasks**

- Where each movements export will be saved: the only account, or a selector when the user has more than one (the format doesn't identify the account).
- "Bancolombia: lo que ya leemos" with the Excel formats only, and "Cómo cuidamos tus datos" saying exactly what is sent.
- The empty summary gains the bank's download paths (`v8-12`); copy that promises later stages is fixed.
- The empty states' action reads "Ir a Subir": files are uploaded only on that screen, and "Subir extracto" in every section suggested otherwise (decided with the human).

**Done when:** an export shows its destination; the formats and privacy copy are true today.

**Commit:** `feat(web): accounts, formats and privacy panel for uploads`

#### 5.4a Submit action and ingestion job

Phase 5.4 was split in two, with the human's approval.

**Tasks**

- The user's row is created on their first statement, just before writing (`findOrCreateUser`, from 3.5). No separate `getCurrentUserId()`, which 4.5 had moved here: like the other services, the submit service takes the session's Clerk id.
- `submitStatement` server action: Zod input (no file name), a byte cap, the session, server-side detection and minimization, the account pinned when that is unambiguous or as chosen on the upload screen (an account id, or the last 4 digits of an account a quarterly statement of the same batch creates, 5.3b, kept in the job's new `account_last4`), and the monthly limit of 10 statements. Each parser says its account type and whether its format names the account, so the server pins without parsing; a user with several accounts who chose none gets `ACCOUNT_REQUIRED`. Pending and processing jobs hold a slot and finished ones count when they added at least one movement (decided with the human), in the calendar month in Bogotá, under a per-user lock. It creates the `ingestion_jobs` row and sends the Inngest event with the job and user ids only; if the send fails, the job is deleted and the error thrown.
- Errors sanitized before any log sees them; the server action body limit raised under the hosting limit.

**Done when:** tests cover validation, the byte cap, ownership, the limit (window, reservation, race) and a failed send; the event payload contains ids only.

**Commit:** `feat(web): submit statement action and ingestion job`

#### 5.4b Submit from the upload screen

**Tasks**

- "Subir N archivos" sends the files one at a time, one job per file, and shows each file's outcome; a rejected send offers "Reintentar". A movements export whose account the screen asks for waits for the choice: sent without one, it could land in the user's only account instead of the one a quarterly statement of the batch creates.
- How many statements are left this month ("7 de 10 disponibles"), moved here from 5.3, counted on the server and asked for again after each batch.
- An error boundary for the app's pages.

**Done when:** files are sent in order with per-file outcomes, and the count reflects pending jobs.

**Commit:** `feat(web): submit files from the upload screen`

#### 5.5a Persistence rules for ingestion

Phase 5.5 was split in three, with the human's approval.

**Tasks**

- A reference's last 4 digits next to its HMAC (phone and code references with at least 6 digits), as decided with the human for design v8; the raw reference is still discarded.
- Account resolution: the quarterly statement by its last 4 digits, adopting the account an earlier export created; the export's pinned account (or the one with its pinned `account_last4`, found or created), else the only account the user has when it's processed (a quarterly statement of the same batch may have just created it), or one created without a number. The holder's normalized name stored on the account.
- Statement versions: another version of a period replaces an unverified statement; a verified one keeps later versions out.
- Coverage (the verified quarterly statement wins, in both orders, on its days after its opening balance's day, ADR 0018) and the predicate every reader uses for what counts.
- The balance check stored at ingest: the closing difference and the rows where the chain breaks, as `reconcile` reports them.
- Drop the unused `ingestion_jobs.step`.

**Done when:** database tests prove coverage, versions, account resolution and the exact count of added movements; the migration applies to an empty database.

**Commit:** `feat(db): coverage, statement versions and account resolution`

#### 5.5b Ingestion function

**Tasks**

- An Inngest function with two steps, `claim` and `ingest`. `ingest` parses on the server (authoritative), resolves the account, reconciles, prepares the rows (fingerprints, HMAC), saves them and finishes the job, deleting its content, in one transaction. Steps return ids, codes and counts only; one job per user at a time.
- On final failure: status `failed` with an error code, and the content deleted as well.
- A statement whose movements are all saved already (the same file again, or a range already loaded) ends `done` like any other, with counts such as 0 new and 45 already saved; no separate status (decided with the human). The monthly limit (5.4a) reads the finished job's `stats.added`, so that count keeps its name.
- Database tests in `apps/web`, run after `@xtrakto/db`'s and never in parallel with its rebuild.

**Done when:** an integration test runs the pipeline with fixtures against the local database; re-running it inserts nothing new; a privacy test shows Inngest keeps ids, codes and counts only.

**Commit:** `feat(web): statement ingestion function`

#### 5.5c Daily cleanup of stale jobs

**Tasks**

- A daily cron (03:00 in Bogotá) fails jobs pending or processing for more than 24 hours and deletes their content, through a `SECURITY DEFINER` function without parameters that the catalog test allows by name (ADR 0014).

**Done when:** tests prove the cleanup across users and the 24-hour boundary.

**Commit:** `feat(web): daily cleanup of stale ingestion jobs`

#### 5.6a Status polling

Phase 5.6 was split in three, with the human's approval.

**Tasks**

- Poll the jobs every 2 seconds with one batched server action until they end; results survive a reload (job ids in the URL's fragment).
- A notice when a job takes longer than usual.

**Done when:** results appear without reloading and survive a reload.

**Commit:** `feat(web): ingestion status polling`

#### 5.6b Upload result

**Tasks**

- The upload result of design v8 (`docs/ui/v8-08`) within Stage 5: the counts (in the file, already had, new), the steps ("Leído en tu navegador", "Reconocido", "Revisando duplicados", the balance check) and the status pill ("Saldo verificado", "No cuadra por $12.400", "Sin saldo para verificar"). Later phases add theirs: "Clasificado" and new review groups (Stage 6), "Verificado por tu extracto trimestral" and "referencias agregadas" (10.1), the coverage timeline (10.2).
- A Spanish message for each error code, as in `v8-13`: notices on the normal surface, errors on the attention surface. With no new movements it says the period was already loaded ("Ya tenías todo este archivo").

**Done when:** every outcome and error code reads correctly.

**Commit:** `feat(web): upload result`

#### 5.6c Uploaded files and "Encadenado"

**Tasks**

- "Encadenado": a verified quarterly statement that opens with the closing balance of the account's previous quarterly statement, computed when read, so the upload order doesn't matter.
- The upload screen lists the uploaded files, newest first, each with its result ("Archivos subidos", `v8-07`), labeled from format and period.

**Done when:** "Encadenado" and the list work in both upload orders.

**Commit:** `feat(web): uploaded files and chained statements`

#### 5.7a Movements by day

Phase 5.7 was split in three, with the human's approval; its detail panel moved to 6.3.

**Tasks**

- A Server Component listing the account's movements that count, newest first, grouped by day with the day's balance (when the day has one), the bank's text exactly as printed, "Sin descripción del banco" for a text of `0`, signed amounts, and "Mostrar 30 más". Only display columns reach the browser.
- No category column: categories arrive in Stage 6, and stages are built in order (decided with the human).
- The summary's empty state changes once the user has movements.

**Done when:** the page shows the seeded data correctly.

**Commit:** `feat(web): movements by day`

#### 5.7b Period selector and account switch

**Tasks**

- The period selector of design v8 (`docs/ui/v8-03`): quarters with their status ("Verificado", "Sin verificar") and the quarter's months, in `searchParams`; the account switch when the user has more than one account.
- The upload result links to the period's movements.

**Done when:** filters survive a reload and can be shared as links.

**Commit:** `feat(web): period selector and account switch`

#### 5.7c Search

Phase 5.7c was split in two (about 500 changed lines), with the human's approval.

**Tasks**

- Search by description (ignoring case and accents) or by amount typed the Colombian way ("$90.000"), within the period.
- "No encontramos «…»" (`docs/ui/v8-13`) when nothing matches, with the way back to every movement.

**Done when:** search works and survives a reload.

**Commit:** `feat(web): search movements`

#### 5.7d "Ver dónde no cuadra"

**Tasks**

- The rows of a quarterly statement that doesn't reconcile, with the row that breaks marked; the list warns when its period has one, and the upload result links to it (`docs/ui/v8-13`).
- A user whose only statements don't reconcile gets a way to them, instead of "Aún no hay movimientos".
- Later phases add the kind tiles and filters, channel tags and "Por revisar" (6.1, 6.2), the detail panel (6.3), interest grouped per month (6.7), "También aparece como" and source files (10.1), and "Descargar CSV" (7.6).

**Done when:** the "No cuadra" view works and survives a reload.

**Commit:** `feat(web): where a statement doesn't reconcile`

#### 5.8 Onboarding _(added with design v8)_

**Tasks**

- The three steps of `docs/ui/v8-15` to `v8-17`, each with "Saltar", with copy true today: what Xtrakto does; what to upload first (the quarterly statement, recommended, or the month's movements) for a Bancolombia savings account, without asking for the name, which comes from the statement; then the download paths of both formats next to the drop zone. No credit cards, other banks or sample data yet.
- The drop zone takes the files chosen to the upload screen, still the only one that reads and sends them, in the browser's memory; the choice of the second step travels in the URL and puts its file's guide first.
- Shown once: Clerk sends the user there right after sign-up, and nothing is stored (decided with the human).

**Done when:** a new user goes through the steps or skips them and lands on the upload screen; the steps work at phone width and with the keyboard.

**Commit:** `feat(web): onboarding`

---

### Stage 6 — Deterministic insights

#### 6.1a Rules from Appendix B

Phase 6.1 was split in two (about 800 changed lines), with the human's approval. Decided with the human on 2026-10-16: the review marks for transfers to or from the holder's name move to 6.2, which compares the name; best guesses follow design v8 (`v8-02`, `v8-03`), so money in from Nequi, a deposit at a _corresponsal_ and a key payment to a savings platform count as moved until the user answers; and a short list of well-known merchants joins the rules in 6.1b.

**Tasks**

- `categorizeByRules(transaction)` in `@xtrakto/core`: an ordered table of rules (`CATEGORIZATION_RULES`) built from Appendix B. A rule matches the description's words, folded (`foldText`: no case, accents or extra spaces) and never inside a word, and says which way the money goes; the first match wins. Returns `null` when no rule applies (the LLM handles those in Stage 8). The holder's name joins as its `context` in 6.2.
- Categories as design v8 shows them (`docs/ui/v8-05`), changing `categories.json` and its generated constants: a new `payment_gateways` ("Pasarelas de pago": Bold, Ebanx, dLocal, where the bank doesn't say the store); `transfers_to_people` becomes "Pagos a personas" and takes in `digital_wallet` (a Nequi send is a payment to a person unless the number is the user's, then it moved); labels "Créditos", "Efectivo", "Restaurantes y domicilios", "Servicios del hogar", "Costos del banco" (4x1000, fees and adjustments) and "Otros".
- A rule gives its best guess and says whether the movement needs review: Bre-B _llave_ payments, PSE payments to banks, fintechs, lenders and investment platforms, deposits at a _corresponsal_, money in from Nequi and the bank's `0`.
- Each rule carries the reason the movement's detail shows (6.3) before "Regla del sistema, sin IA".
- Bank texts beyond Appendix B only when the private test finds them in real files.
- A private test reports, as whole percentages only, how many real movements get a category and how many need review, by format and by rule.

**Done when:** every pattern in Appendix B has a test.

**Commit:** `feat(core): rule-based categorizer`

#### 6.1b Categorized movements

**Tasks**

- A pure step after `prepareStatement` gives each movement its category, its source (`rule`), its rule and whether it needs review, and `saveStatement` requires it: in `ingest`'s transaction (ADR 0019) and in the seed. The schema keeps the rule's id and the review flag, so the quick review (6.3) can group them; an ADR records the decision.
- Rules for well-known merchants (public names and generic words) in purchases, QR and PSE payments.
- The channel tag comes from the description's prefix (design system §9), worked out when read.
- Movimientos shows each movement's channel and category, or "Por revisar" instead; kind colors, tiles and filters come with 6.2.

**Done when:** ingestion stores the category of every movement a rule knows, and the list shows it.

**Commit:** `feat(web): categories and channels on movements`

#### 6.2a Internal movement detection

Phase 6.2 was split in two (about 550 changed lines), with the human's approval. Decided with the human on 2026-10-16: a purchase or a payment at a merchant no rule knows counts as real spending, as "Otros"; a transfer with the holder's name in whole words, from the first name to a surname, counts as moved; one the bank cut, inside a word or before any surname, as it cuts most of them in real files, counts as moved and waits for review.

**Tasks**

- The transaction's `kind` comes from its category (`categoryKind`) and is never stored apart: the unused `kind` column goes (ADR 0024).
- `categorizeByRules(transaction, context)`: the account's holder name, which a quarterly statement prints and the account keeps for its exports, makes `TRANSF A`, `TRANSF DE` and `PAGO LLAVE` to or from it moved (`own_account_transfer`): whole words without asking, a name the bank cut to review. The first name must be the holder's, so a sibling with the same surnames is another person.
- Moved goes both ways (design v8): money back from the user's own name is moved (+), never income.
- A fallback rule gives "Otros" to the purchases, QR and PSE payments no merchant rule knows.
- The account keeps the holder's name and the movements the rule that matched it (`own_name_*`), for "Cómo te escribe el banco" (`docs/ui/v8-11`, 7.7). References the user marks as their own come with 6.3, which marks them.

**Done when:** tests cover truncated names and partial matches that must not count.

**Commit:** `feat(core): internal movement detection`

#### 6.2b Kinds in Movimientos

**Tasks**

- Movimientos as `docs/ui/v8-03` draws kinds: each row's icon chip and amount in its kind's colors (neutral and in ink while it waits for review or has no category), the color legend under the title, the period's kind tiles (Ingresos, Gasto real, and Movido out and back, with their counts), and the filters Todo / Ingresos / Gasto real / Movido / Por revisar with its count.
- Onboarding's first step gains "Separa lo que gastaste de lo que solo moviste", left out in 5.8.

**Done when:** the list shows each movement's kind and filters by it, at phone width and with the keyboard.

**Commit:** `feat(web): kinds in the movements list`

#### 6.3a User rules

Phase 6.3 was split in four (about 1,500 changed lines), with the human's approval, in five when 6.3b came out at about 750, in six when 6.3d was estimated at about 600, and in eight when 6.3f was estimated at about 1,000 (both on 2026-10-19). Decided with the human on 2026-10-16: the quick review asks about a period and an account, like Movimientos, and an answer becomes a rule for every statement; of the card payments, only the PSE ones are asked (`PAGO SUC VIRT TC` stays sure, though `v8-02` asks about it); answered groups stay on the review, closed and with "Cambiar", so a movement keeps the rule that guessed it after the user decides. "No sé" keeps the best guess and takes those movements out of the review without a rule, and the bank's `0` is answered by group but never makes a rule.

**Tasks**

- `user_category_rules`, with forced Row-Level Security: a bank text, folded, with the direction of its money, or a reference's HMAC with its last 4 digits; one per text and direction and one per reference, the latest answer replacing the earlier one; never the bank's `0`.
- `categorizeStatement` applies the user's rules before the table's (the reference's, then the text's), with `category_source = "user"`, never to review, and keeps the table's rule that matched; the CHECKs follow (ADR 0025).
- Saving a rule gives its category to the user's movements it holds for, in every statement; ingestion reads the user's rules.

**Done when:** tests prove the precedence, the folding and the direction, the movements already saved getting the rule's category, and that a user's rules never touch another user's.

**Commit:** `feat(db): user category rules`

#### 6.3b Quick review: ask and answer

The quick review was split in two (about 750 changed lines), with the human's approval: asking and answering here, closing in 6.3c. Decided with the human: the review shows the account's latest quarter, or the one the URL asks, without the quarter picker, as `v8-02` draws it. It came out at about 810 lines, and lands in two commits of one pull request (decided with the human): the answers, then the page.

**Tasks**

- The quick review of design v8 (`docs/ui/v8-02`) at `/review`, for the account and quarter in the URL or the latest: the movements that count and wait for review, asked by group (the holder's cut name going out, key payments to platforms and to people, money in from the user's name or Nequi, deposits at a _corresponsal_, PSE payments to banks and fintechs, to investment platforms and to lenders, and the bank's `0`), each with its question, the bank's texts with their counts, the amount at stake and the answers, the best guess first ("Sugerido: la primera").
- An answer saves a user rule for each text of the group (6.3a), and gives the bank's `0` its category movement by movement; "No sé" takes the movements out of the review, keeping the guess. An answered group leaves the page.

**Done when:** answering a group recategorizes its movements in every statement and in the next upload; the review works at phone width and with the keyboard.

**Commits:** `feat(web): quick review answers by group`, then `feat(web): quick review page`

#### 6.3c Quick review: answered groups and the banner

**Tasks**

- Answered groups stay on the review, closed, with what they now count as ("Son tuyas: 5 movimientos cuentan como movido.") and "Cambiar", which asks again; after an answer, the focus stays on its group.
- The status pill beside the title ("6 grupos · 38 movimientos").
- The summary shows the review banner while groups are pending ("Tienes 4 grupos por revisar (24 movimientos)", design system §9), for the review's account and quarter.

**Done when:** a group answered stays closed after a reload and can be answered again; the banner shows only while something waits for review.

**Commit:** `feat(web): answered groups and the review banner`

#### 6.3d Nequi numbers

Phase 6.3d was split in two (about 600 changed lines), with the human's approval: the Nequi numbers here, "Lo que está en juego" in 6.3e. Decided with the human on 2026-10-19: a Nequi send that carries the recipient's number (only movements exports do) is a best guess, a payment to a person waiting for review, so the review, the banner and Movimientos count the same, though `v8-03` draws it as sure; and a number the user says isn't theirs is remembered, as that number's rule for money going out.

**Tasks**

- A rule for Nequi sends with a phone number (`nequi_out_number`, before `nequi_out`): a payment to a person, to review. A rule can ask for a reference of a kind.
- A reference rule holds the ways its category allows: money that only moves, both; a payment to a person, money out; an income, money in. An ADR records it.
- The Nequi group of `v8-02`: the quarter's numbers with their count and total and an "Es mío" switch. "Guardar" saves a rule for each number, moved for those marked and a payment to a person for the rest, and "Ninguno es mío" a payment to a person for every one. Answered, the group closes like the others, and "Cambiar" can mark more numbers as the user's; taking one back comes with 6.3h.
- The switch joins the design system.

**Done when:** a number marked as the user's counts as moved in every statement and in the next upload, and one marked as someone else's isn't asked again for money going out.

**Commit:** `feat(web): Nequi numbers in the quick review`

#### 6.3e "Lo que está en juego"

**Tasks**

- "Lo que está en juego" beside the groups (`v8-02`): the progress ("2 de 6 respondidos", the movements waiting), and each open group with its amount, what it counts as today and what another answer would change in the period's totals ("Si son compras, tu gasto real sube a $30,4M"), with "Ver mi resumen" and "Responder después".

**Done when:** the panel's figures are tested, and it works at phone width and with the keyboard.

**Commit:** `feat(web): what's at stake in the review`

#### 6.3f Detail panel

Phase 6.3f was split in three (about 1,000 changed lines), with the human's approval on 2026-10-19: the panel here, the corrections in 6.3g, and the user's own accounts with their undo in 6.3h. Decided with the human: on phones, the detail opens as a full-screen sheet over the list, which its X, Escape or the browser's Back close, giving the focus back to the movement.

**Tasks**

- The detail panel of `v8-03`, moved here from 5.7: a movement of Movimientos opens it (`?movement=` in the URL, with the list's filters), beside the list from `lg` and as the sheet on phones. It shows the movement's real fields (date, amount, "Así lo escribe el banco", channel, the reference's last 4 digits, the statement it came from, balance after) and its kind and category with the reason: the rule's ("Regla del sistema, sin IA"), a best guess with the way to the quick review, or the user's answer.
- With no movement chosen, the side column says what the panel shows. Later phases add theirs: the corrections (6.3g), "Es mío" and its undo (6.3h), "Es un pago fijo" (6.5), the plain-language title (8.6), and "También aparece como" with the other files (10.1).

**Done when:** every field reads right from seeded data, a movement of another account or user never opens, and the panel works with the keyboard and at phone width.

It came out at about 580 lines and lands in two commits of one pull request (decided with the human): the query, then the panel.

**Commits:** `feat(db): movement detail query`, then `feat(web): movement detail panel`

#### 6.3g Corrections

**Tasks**

- In the panel, the kind and the category become choices (`v8-03`), the kinds the money's direction allows: "Guardar cambios" gives that movement the user's category, and "Aplicar a los N parecidos" saves a rule for its text and direction (6.3a), in every statement. The bank's `0` makes no rule.
- These corrections are the labeled data for Stage 14.

**Done when:** actions validate input and ownership; tests cover correcting one movement and its similar ones.

It came out at about 460 lines and lands in commits of one pull request (decided with the human): the queries, with a text's rule now leaving what a number's rule says, then the form.

**Commits:** `feat(db): count a rule's movements and keep number rules first`, then `feat(web): category corrections`

#### 6.3h Your own accounts and undo

Decided when it started (2026-10-19): "Es mío" is for Nequi numbers, as the quick review asks (6.3d); a transfer recipient, a bank text, becomes the user's with 6.3g's "Aplicar a los parecidos" as "Entre tus cuentas". An undo deletes the rule, and its movements take what the user's other rules say, else the table's rule each one kept (ADR 0025, amended).

**Tasks**

- In the panel, "Es mío" for a Nequi send or receipt with its number, which saves the number's rule as moved, and "Deshacer" for the rule of its number, also one marked in the quick review (6.3d), and for the rule of its text: its movements go back to what the user's other rules or the table of rules say.

**Done when:** actions validate input and ownership; tests cover marking, an undo, and a number marked in the quick review.

It came out at about 560 lines and lands in commits of one pull request (decided with the human): the undo's query, then the panel.

**Commits:** `feat(db): undo a user's category rule`, then `feat(web): your own accounts and undo`

#### 6.4 Summary computations

Decided with the human on 2026-10-19: the figures of each day instead of each month, since `v8-01` draws the summary day by day ("Tu saldo y tu gasto real, día a día") and each month is a period of its own in the selector.

**Tasks:** pure functions over a period's transactions:

- Income (without the money that came back from the user's own accounts), total outflows, real spending, money that moved (by type, out and back), spending and income by category, and each day's income, spending and money that moved, each with its count.
- Interest earned, 4x1000 paid, cash total.
- Credit card payments without an uploaded card statement.
- The bank's own figures for the account card: average balance and interest paid, from the quarterly statement.
- A quarterly statement that doesn't reconcile stays out of every figure until it does (decided with the human, Phase 5.5); on its days, the movements exports' rows count instead, if there are any. Every figure uses Stage 5's predicate for the movements that count.

**Done when:** tests compare against hand-computed results on the fixtures.

It came out at about 270 lines, with the reads of an account's figures that the summary page (6.7) calls.

**Commit:** `feat(core): summary computations`

#### 6.5 Recurring payments

**Tasks**

- Detect payments with the same normalized description (or reference hash), a similar amount and a similar day of the month in at least three consecutive months (design v8: "Necesitamos 3 meses para encontrarlos"; the roadmap said two months before v8, and the human confirmed the change), even when the bank writes it differently or it's paid through another channel.
- Exact amounts (loan installments) and variable amounts (utilities) must both work.
- Output: label, typical amount, typical day or range of days, channels, months seen, last date, and how the amount moves ("Estable", "Varía poco", "Monto variable", "Subió 12%").
- What repeats but isn't spending (card payments, savings) goes in a list of its own (`docs/ui/v8-04`).

**Done when:** tests cover fixed and variable payments and false positives.

It came out at about 330 lines. The label is who was paid as the bank writes it, after its channel's words ("Financiera Andes S"); plain-language titles such as `v8-04`'s "Energía" come with 8.6.

**Commit:** `feat(core): recurring payment detection`

#### 6.5b Recurring payments page _(added with design v8)_

Added by the human on 2026-10-19: no phase built the screen of `docs/ui/v8-04`, and `/recurring` kept its empty state from 4.6. Split in two when it started (about 900 changed lines estimated), with the human's approval: the list here, and what depends on today's date in 6.5c.

**Tasks**

- "Pagos fijos" (`docs/ui/v8-04`) for the account and period in the URL, with the period controls of Movimientos, which both pages now share: the payments 6.5 finds that were paid in the period's last month with movements, ordered by amount, each with its months as bars, its days, channels, installments and how its amount moves, and that month's total; "También se repiten, pero no son gasto"; and "Cómo los encontramos". Marking a payment as fixed by hand ("¿Falta alguno?") is in no phase.
- The seed's January to March 2027 statement gains invented fixed payments, so the page shows them.

**Done when:** the page renders from seeded data, works at phone width and is navigable with the keyboard.

It came out at about 600 lines, besides moving about 390 to share the period controls, the category's icon and the URL's account and period with Movimientos and the review. It lands in commits of one pull request (decided with the human): the design rules, the shared pieces, the payments of a period, and the page.

**Commits:** `docs(rules): recurring payments page`, `refactor(web): share the period controls and the category icon`, `feat(web): recurring payments of an account's period`, then `feat(web): recurring payments page`

#### 6.5c Recurring payments: what to expect _(added with design v8)_

Decided with the human when it started (2026-10-20): the calendar shows today's month, as v8 draws it, while the page's month is this one or the one before (this section said the next month's); and "Pendiente" waits for this month's movements, so the page never says that a payment didn't come in a month the user hasn't uploaded. A month whose movements don't reach its last day still expects the payments of the month before, so one due later in it doesn't look stopped.

**Tasks**

- The tiles of `docs/ui/v8-04`: "Pagas al mes", "Al año" and the payment that rose most.
- "Ya no aparecen": the payments that stopped before the period's last month.
- This month's calendar, with each payment's day or range of days, today, and "Pendiente" for a payment of this month that hasn't appeared yet.

**Done when:** the figures and the pending payments are tested against a fixed today, and the page works at phone width and with the keyboard.

Estimated at about 480 lines, it came out at about 700 and lands in commits of one pull request (decided with the human): the tiles and the payments that stopped, then the calendar; besides the design rules, the filter chips that Movimientos and Pagos fijos now share, and the months of a quarter that didn't fit at 360px.

**Commits:** `docs(rules): what to expect from recurring payments`, `refactor(web): share the filter chips`, `fix(web): fit a quarter's months at 360px`, `feat(web): recurring payments' tiles and those that stopped`, then `feat(web): what to expect from recurring payments`

#### 6.6 Insights ("Para revisar")

Decided with the human when it started (2026-10-20): the card payments' insight, which invites the user to upload the card's statement, waits for Stage 12 (12.5), when Xtrakto can read one, so the copy stays true today.

**Tasks:** typed generators with Spanish templates, numbers computed in code:

- 4x1000 charged (amount and dates), with the suggestion to check whether the account is marked as exempt.
- Savings yield: interest earned vs average balance, from the bank's own figures, as an effective annual rate.
- Money without detail: cash withdrawals, and payments through gateways that hide the store ("6 pagos sin tienda identificada", `docs/ui/v8-05`).
- New recurring payments or increased amounts (needs at least two periods): a payment is new when its third month in a row falls in the period and the account has movements in the month before its first.

**Done when:** each generator is tested and returns nothing when data is insufficient.

**Commit:** `feat(core): insight generators`

#### 6.7 Summary page

Following design v8 (`docs/ui/v8-01`), with Server Components and client components only for interactive charts. Split in five when it started (about 1,500 changed lines estimated), with the human's approval (2026-10-20). v8 shows the share of real spending and of what moved as the KPI tiles' rings, so they take the place of the "real vs moved bar" this phase named; "Tu extracto, traducido" and "Pregúntale a tu extracto" wait for 8.6 and 13.

#### 6.7a Summary at a glance

**Tasks**

- The summary page for the account and period in the URL, with the period controls of Movimientos and Pagos fijos and "Subir extracto": the title row with the color legend, the review banner, and "Tu trimestre de un vistazo": the headline (what went out, and that not all of it was spending) and the three KPI tiles, Ingresos, Gasto real and Movido, each with its ring, what it means, and the way to its movements.
- The KPI tile (stat card with its progress ring, design system §9), moved here from 4.3.
- Onboarding's welcome example gets its kind rings back, left out in 5.8.

**Done when:** the page renders from seeded data, works at phone width and is navigable with the keyboard.

**Commit:** `feat(web): summary at a glance`

#### 6.7b Your account card

**Tasks**

- "Tu cuenta" (`v8-01`): the balance at the period's end, the account, the bank's own figures (average balance, interest paid) and the status pill (verified, chained, without balance, doesn't reconcile), with the statement illustration.

**Done when:** each status reads right from seeded data, at phone width too.

**Commit:** `feat(web): your account card`

#### 6.7c Balance and real spending, day by day

Decided with the human when it started (2026-10-20): the day pointed out is the one the most income came in, as `v8-01` draws it, when it stands out on the scale; and a period whose files print no balances (movements exports only) gets the real spending's line alone, saying so.

**Tasks**

- The chart card of `v8-01` from 6.4's days: the balance as a line with its area, the cumulative real spending dashed, their legend, the reading guide, axes with printed values, and one highlighted event explained in plain language; a text alternative that states the conclusion.

**Done when:** the chart's figures are tested, and it reads at phone width and without a mouse.

Estimated at about 450 to 550 lines, it came out at about 490 and lands in commits of one pull request (decided with the human): the design rules, the balance day by day in core, and the chart.

**Commits:** `docs(rules): balance and real spending day by day`, `feat(core): balance day by day`, then `feat(web): balance and real spending day by day`

#### 6.7d Where it went and what to review

Decided with the human when it started (2026-10-20): the tiles are the three categories that weigh most and "Costos del banco · revisar" when the bank charged the 4x1000, small as it may be, as `v8-01` draws them; without the 4x1000, the four that weigh most.

**Tasks**

- "Dónde se fue más" (`v8-01`): the categories that weigh most in real spending, each with what it means, notes from 6.6's insights and the recurring payments ("Dos cuotas, a inicios de mes."), and the attention tile for what needs a look ("Costos del banco · revisar").
- Pagos fijos's tile that rose and its titles take core's words (6.6).

**Done when:** the tiles' figures and notes are tested, at phone width and with the keyboard.

Estimated at about 400 to 500 lines, it came out at about 300 added and 90 deleted, and lands in commits of one pull request (decided with the human): the design rules, the pieces Pagos fijos now shares with the summary (core's words, the channels in running text, the year of history), and the tiles.

**Commits:** `docs(rules): where it went and what to review`, `refactor(web): share Pagos fijos's words and pieces with the summary`, then `feat(web): where it went and what to review`

#### 6.7e Interest by month in Movimientos

Decided with the human when it started (2026-10-20): the footer counts the movements its lines hold ("Mostrando 59 de 312"), so it reaches the subtitle's count, while "Mostrar 30 más" adds lines.

**Tasks**

- In the transactions list, group the daily interest rows into one line per month ("Intereses de septiembre", "30 abonos diarios, agrupados en una línea").

**Done when:** the list, its counts and its pages read right with the grouped rows.

It came out at about 150 lines, in two commits of one pull request: the design rules, and the list.

**Commits:** `docs(rules): interest by month in the movements list`, then `feat(web): interest by month in the movements list`

#### 6.8 Categories page _(added with design v8)_

Split in three when it started (about 1,300 to 1,500 changed lines estimated), with the human's approval (2026-10-20): the page here, a category's detail in 6.8b, and its weeks and places in 6.8c. Decided with the human: v8's "Ver y editar tus reglas", "Ver reglas" and "Mover movimientos a otra categoría" wait for a phase that edits rules or moves movements, so the copy stays true today; a rule is still undone from a movement's detail in Movimientos.

#### 6.8a Categories page

**Tasks**

- `docs/ui/v8-05`: real spending by category, largest first, each with its share and count; "Movido no es gasto", with money out (to the investment, the accounts, the cards) and money back; payments through gateways without a store, with a prompt to name them; the user's rules from the quick review.
- Categorías joins the dock.

**Done when:** the page renders from seeded data, works at phone width and is navigable with the keyboard.

It came out at about 540 lines, in commits of one pull request: the design rules, the pieces the summary now shares (the insight tile, the channels a category took, a share in percent, a category's name), and the page.

**Commits:** `docs(rules): categories page`, `refactor(web): share the insight tile and a category's words`, then `feat(web): categories page`

#### 6.8b A category's detail

Decided when it started (2026-10-21): only categories of real spending have a detail, as `v8-05` draws a chevron on their rows alone; "Por mes" is for a quarter, as this section says; and its newest movements open their detail in Movimientos, among the category's (decided with the human).

**Tasks**

- `docs/ui/v8-06`'s top half: the way back to Categorías, the category's name and kind, and its tiles (the period's total with its count and share, the average movement and the largest, and each month of a quarter); its latest movements, with "Ver los N movimientos" in Movimientos filtered by the category (`?category=`, a new filter); and "Ajustes de esta categoría": what it counts as and the user's rules for it.
- The page's rows open their category's detail.

**Done when:** the detail renders from seeded data, the filter keeps the list's counts right, and both work at phone width and with the keyboard.

Estimated at about 750 to 850 lines, it came out at about 765 and lands in commits of one pull request (decided with the human): the design rules, the movements of a category in Movimientos, the pieces the detail shares (a period in words, how a row of movements reads), the detail's figures, and the page.

**Commits:** `docs(rules): a category's detail`, `feat(web): movements of a category`, `refactor(web): share a period's words and how a movement's row reads`, `feat(web): a category's figures`, then `feat(web): a category's detail`

#### 6.8c A category's weeks and places

Decided when it started (2026-10-21): the weeks are seven days from the period's first, as v8 draws them ("Semana del 5 de agosto" in a quarter that starts on 1 July), drawn through the account's last day with movements; the week that stands out says what a normal week took ("Una semana normal es de $210 mil.", decided with the human); and a place joins the names the bank cut, as Pagos fijos joins payees, so names that start differently stay apart.

**Tasks**

- `docs/ui/v8-06`'s "Semana a semana": what the category took each week of the period, with the week that stands out explained in plain language.
- "Dónde más": the category's places, grouping the different ways the bank writes the same one ("COMPRA EN APP DOMICILIOS" and "PAGO QR APP DOMICIL").

**Done when:** the chart's figures and the grouping are tested, and both read at phone width and without a mouse.

Estimated at about 500 to 600 new lines and 150 moved, it came out at about 560 net (784 added and 222 deleted, about 190 of them moved to share the chart with the summary), in commits of one pull request (decided with the human): the design rules, the shared line chart, payees grouped for any movements, places in core, the weeks and places as figures, and the page.

**Commits:** `docs(rules): a category's weeks and places`, `refactor(web): share the line chart`, `refactor(core): group any movements by payee`, `feat(core): where a category's money went`, `feat(web): a category's weeks and places, as figures`, then `feat(web): a category's weeks and places`

---

### Stage 7 — First deployment (private beta)

#### 7.1 [HUMAN] Domain xtrakto.site on Vercel

Its work came with 16.0d (ADR 0022): the Vercel project, the domain with its DNS, and `docs/deployment.md`. Checked when it closed (2026-10-21): until 7.2, the app xtrakto.site serves is the waitlist-only deployment, built from `main`; the whole app goes on with 7.2.

**Human:** create the Vercel project with `apps/web` as the root directory, add `xtrakto.site` and create the DNS records at Hostinger as Vercel indicates.

**Tasks:** `docs/deployment.md` with the steps followed.

**Done when:** `https://xtrakto.site` serves the app.

**Commit:** `docs: deployment guide`

#### 7.2 [HUMAN] Production services

Decided with the human when it started (2026-10-21): sign-up by invitation only, a visitor without a session at `/` goes to sign-in while the waitlist stays at `/waitlist`, and Google sign-in through the app's own OAuth client (ADR 0027). Its consent screen stays in "Testing" until 7.5's privacy page lets Google publish it.

**Human:** production database, Clerk production instance (it needs the domain) with "Allow users to delete their account" off (User & authentication → User model; `/settings` deletes the data first), Inngest connected to Vercel, environment variables in Vercel, Clerk webhook endpoint registered, and the owner's password reset in Neon (pending since 16.0d) before its connection string becomes the job's secret.

**Tasks**

- Run migrations against production from a CI job on `main`, with the owner connection string stored as a GitHub secret. Its first run applies those after `0010`, which wait for it (7.1).
- An environment checklist in `docs/deployment.md`.

**Done when:** a test account can upload a synthetic XLSX in production and see its summary.

**Commit:** `ci: production migrations`

#### 7.2b End-to-end tests with Playwright (pending)

Pending from Phase 4.5: a browser test of the account deletion flow, with a dedicated Clerk test account and the CI browser installed. The happy-dom regression test of the hook runs in every CI job meanwhile.

**Commit:** `test(web): end-to-end tests with Playwright`

#### 7.3 Error monitoring with Sentry

Decided with the human when it started (2026-10-22): the browser too, not only the server; one request in ten traced; and the forced error from a temporary route, deleted before the commit. Sentry 11 collects everything by default, so the scrubber is an allowlist (ADR 0028).

**Tasks**

- `@sentry/nextjs` without default PII, without session replay, and with a scrubber that removes request bodies, server action arguments, query strings (Movimientos keeps search terms in `q`) and any description or amount.

**Done when:** the scrubber is tested; a forced error reaches Sentry without sensitive data.

**Commit:** `feat(web): Sentry with PII scrubbing`

#### 7.4 Product analytics with PostHog

Split in two when it started (about 550 changed lines estimated), with the human's approval (2026-10-27). Decided with the human: PostHog Cloud US; the consent is asked in a notice above the dock, both answers of the same weight, and kept in the browser; and `category_corrected` counts only the corrections of a movement's detail.

#### 7.4a Consent and PostHog, through an allowlist

**Tasks**

- PostHog in the browser, downloaded only after the person's consent, with autocapture, session recording and everything else automatic off, nobody identified, and an allowlist in `before_send` (ADR 0029).
- The consent notice above the dock (v8 doesn't draw it), and "Medición de uso" in `/settings` to change the answer at any time; withdrawing deletes PostHog's id.
- `summary_viewed`, the first event, to prove the way to PostHog.

**Done when:** nothing loads or goes without consent, events carry no financial or personal data and no URLs with search terms (tested), and a check reaches PostHog with only what the allowlist keeps.

**Commit:** `feat(web): analytics after consent, through an allowlist`

#### 7.4b Upload and correction events

**Tasks**

- Explicit events only (`statement_uploaded`, `ingestion_failed`, `category_corrected`) with format ids, row count buckets and error codes, once each, for the files the page sent.

**Done when:** events carry no financial or personal data, and no URLs with search terms (tested).

**Commit:** `feat(web): privacy-preserving product analytics`

#### 7.5 Data flow document and privacy page

Decided with the human when it started (2026-10-27): the controller the page names is Carlos Tello, a natural person in Bogotá, with hola@xtrakto.site, which forwards to the owner's mailbox (the domain had no mail records, so the waitlist's address bounced); the page is `/privacy`, public, linked from the waitlist's footer, the analytics notice and "Medición de uso".

**Tasks**

- `docs/data-flow.md` with a Mermaid diagram: what happens in the browser, what reaches the server, what is stored and for how long, and what each third party receives (Clerk, Inngest, Sentry, PostHog; LLM providers from Stage 8).
- A privacy page in Spanish summarizing it, with deletion instructions. Note: a legal review under Colombian data protection law (Ley 1581 de 2012) is required before the public launch.
- Its link in Google's OAuth consent screen (Google Cloud project `xtrakto`), which then can be published, so any invited person signs in with Google, not only its test users (7.2).

**Commit:** `docs: data flow and privacy page`

#### 7.6 Export my data

Decided with the human when it started (2026-10-27): the CSV is for Excel in Spanish (semicolons, a decimal comma, a byte order mark), and "Descargar mis datos" holds every movement saved, also those that count nowhere, saying which count, as the right to know one's data asks; Movimientos's CSV holds what its list shows.

**Tasks:** CSV export of all the user's transactions from settings, next to the "delete my data" action ("Descargar mis datos (CSV)", `docs/ui/v8-11`), and of the selected period from Movimientos ("Descargar CSV", `v8-03`).

**Done when:** the export contains only the user's data (tested).

**Commit:** `feat(web): export my data`

#### 7.7 Profile _(added with design v8)_

`/settings` becomes "Tu perfil" (`docs/ui/v8-11`): the Xtrakto account ("Administrar inicio de sesión"), how the bank writes the holder's name (6.2), the accounts and references marked as the user's (6.3), plan usage, the privacy facts, "Descargar mis datos (CSV)" (7.6), "Borrar todos mis datos" (4.5, with the white destructive button of design system §9) and the session. Perfil joins the dock, as v8 shows, and the avatar menu's "Configuración" link (Phase 4.6) goes away (decided with the human).

Split in three when it started (about 1,000 changed lines estimated), with the human's approval (2026-10-27): the page and its place in the dock here, the account, the plan and the session in 7.7b, and how the bank writes the holder's name and what is the user's in 7.7c. Decided with the human: on phones the bar keeps Resumen, Movimientos and Subir and puts the rest under "Más" (Pagos fijos, Categorías, Perfil), as v8 draws it without Pregúntale, which joins before "Más" in Stage 13 without moving the others; and the page moves to `/profile`. What v8 draws that a later phase brings stays out, so the copy is true today: "Tus datos" with the coverage timeline (10.2), the email notices (10.4), "Preguntas hoy" (13), and the pages and IP of PDFs (9). No phase brings "Agregar otra forma en que aparece tu nombre" or "Agregar una referencia" (a movement's detail makes a text or a number the user's, 6.3g and 6.3h), nor the "Principal" badge; and the session shows the last sign-in without the browser and system, which Clerk's session would bring along with its IP and city.

#### 7.7a Profile in the dock

**Tasks**

- Perfil (`user`) joins the dock; on phones "Más" opens what the bar can't fit, and it looks active while one of its pages is open. The avatar menu keeps only Clerk's own items.
- The page at `/profile`, with v8-11's two columns: "Privacidad y datos" (three facts true today, "Descargar mis datos (CSV)" and "Borrar todos mis datos" with the white destructive button) and "Medición de uso" (7.4a) in the side column, where v8 draws the email notices. The copy that named "Configuración" names the profile.

**Done when:** the dock fits at 360px and from `sm`, "Más" works with the keyboard, and the page works at phone width.

**Commit:** `feat(web): profile in the dock`

#### 7.7b Your account, plan and session

**Tasks**

- "Tu cuenta en Xtrakto" from Clerk: the initial, the name, the email, how the user signs in ("Entras con Google") and "Administrar inicio de sesión", which opens Clerk's profile.
- "Tu plan": the statements of the month with their meter and when they renew (5.4b), and the 10 MB limit.
- "Sesión": the last sign-in, and "Cerrar sesión".

**Done when:** each section reads right for a test account, at phone width and with the keyboard.

**Commit:** `feat(web): your account, plan and session`

#### 7.7c How the bank writes you and what's yours

**Tasks**

- "Cómo te escribe el banco": the holder's name as the statements print it, and the texts that the rules of the holder's name recognized (6.2), whole or cut.
- "Tus cuentas y lo que es tuyo": the accounts, and the user's rules that make something theirs (Nequi numbers, cards, investments, transfers between their accounts; 6.3), each with an "×" that undoes it as a movement's detail does (6.3h), through an action that takes the rule's id and checks that it's the user's.
- The page's subtitle becomes v8's.

**Done when:** every section shows the user's data or its empty state, another user's rule can't be undone (tested), and it works at phone width and with the keyboard.

**Commit:** `feat(web): how the bank writes you and what's yours`

#### 7.8 Sample data to explore _(added with design v8)_

**Tasks:** "Explorar con datos de ejemplo" (`docs/ui/v8-17`): a read-only demo loaded with the synthetic fixtures, so someone without statements can see every screen. It also brings back "Ver con datos de ejemplo" in the empty summary (`v8-12`) and in onboarding's last step, left out in Stage 5.

**Commit:** `feat(web): explore with sample data`

---

### Stage 8 — LLM layer _(outline)_

**Goal:** one observable, cost-bounded way to call LLMs, and the first LLM features.

- **8.1 [HUMAN] AI module:** `lib/ai` with the Vercel AI SDK, primary and fallback providers, structured output validated with Zod, one retry on the fallback model, timeouts.
- **8.2 Prompts and tracing:** prompts as versioned files; Langfuse records model, tokens, cost and latency, with inputs and outputs masked.
- **8.3 Usage and limits:** `llm_usage` table; per-user monthly cost cap, chat questions per day and request rate (Postgres counters); platform budget alert at 80% and hard stop at 100%.
- **8.4 Evaluation harness:** `packages/evals` with a labeled synthetic set of at least 200 realistic, redacted descriptions; accuracy, macro-F1 and coverage with a threshold. Runs in CI only when prompts or the AI module change, and on demand.
- **8.5 LLM categorization fallback:** unique redacted descriptions in batches; output restricted to category ids with a confidence; a global cache keyed by the redacted normalized description; `category_source = "llm"`.
- **8.6 "Tu extracto, traducido":** a plain-language explanation per distinct description pattern (not per row), cached; counts and amounts inserted by code. Onboarding's first step gains "Traduce cada movimiento", left out in 5.8.

### Stage 9 — PDF statements _(outline)_

- **9.1 Browser extraction:** pdf.js in a Web Worker; ask for the password when the file is encrypted, with the hint "suele ser tu número de documento" (`docs/ui/v8-09`); the password never leaves the browser; output text items with positions. Movements export PDFs have no password. The upload screen and onboarding then mention PDF ("Excel o PDF", the password hint), left out in Stage 5.
- **9.2 Layout reconstruction:** text items → rows, grouping by vertical position with a tolerance and assigning columns by the header's horizontal ranges. Synthetic fixtures of text items.
- **9.3 Quarterly statement PDF parser:** Appendix A.3. Private parity test: the PDF and the XLSX of the same statement produce identical transactions.
- **9.3b Movements export PDF parser** _(added with design v8)_: the fourth format ("Movimientos de la Sucursal Virtual (PDF)"); descriptions split across two lines are joined (`docs/ui/v8-08`). Private parity test against the XLSX of the same range.
- **9.4 Edge cases:** wrong password, PDFs without a text layer (scanned), 30-page limit, size limit, each with a clear message.

### Stage 10 — Monthly use and retention _(outline)_

- **10.1 Cross-format deduplication:** match movements-export rows against existing quarterly rows by date, normalized description, amount and occurrence order, allowing one day of difference for `ABONO INTERESES AHORROS` (paid the next day except at a month's end) and a description the quarterly statement cut before an accented letter (Appendix A.2), also between two movements exports, since their dates depend on where each requested range ends. Never count a movement twice. A matched movement gains what the export brings (design v8, `docs/ui/v8-08` and `v8-03`): its reference ("12 referencias agregadas"), the export's way of writing it ("También aparece como") and the file as one more source; an export whose movements all match is "Verificado por tu extracto trimestral". Matching clears Stage 5's coverage (`covered_by_statement_id`) for the matched rows and carries their references over.
- **10.2 Coverage and gaps:** date ranges with data per account, shown as the coverage timeline (`docs/ui/v8-07`, `v8-08`, `v8-11`) and as "Año" in the period selector with its coverage ("9 de 12 meses"); the missing periods ("Te falta abril a junio", `v8-13`) and which range to download (the bank allows the current month and the previous three). "Encadenado" was built in 5.6c.
- **10.3 Optional current balance:** when uploading a movements export, the user can enter the current balance to rebuild balances backwards and verify them.
- **10.4 [HUMAN] Email:** Resend with a sending subdomain (for example `mail.xtrakto.site`) and SPF, DKIM and DMARC records at Hostinger. Watch deliverability: some filters distrust the `.site` extension. Monthly reminder through an Inngest cron, with unsubscribe. The profile's email notices (`docs/ui/v8-11`): a file is ready, something to review, a recurring payment went up, the monthly summary; never amounts.
- **10.5 Monthly summary email:** "Your summary is ready" with a link; no amounts or descriptions in the email.

### Stage 11 — Unknown formats: ingestion agent _(outline)_

- **11.1 Fingerprints and saved mappings:** fingerprint of a format from its normalized header; `format_mappings` table (global, no user data): column roles, date and amount formats, sign convention.
- **11.2 Mapping proposal:** the LLM receives the header and at most 10 redacted sample rows and proposes a mapping, validated with Zod and checked with a dry-run parse and reconciliation.
- **11.3 Confirmation screen:** when the mapping can't be verified, the user confirms or corrects it. Confirmed mappings are reused deterministically, without the LLM. The upload screen and onboarding then offer "¿Otro banco?", left out in Stage 5.
- **11.4 Agent with LangGraph.js:** detect → propose → dry run → verify → retry with a stronger model or ask the user, with explicit state.
- **11.5 Evals:** synthetic spreadsheets from other banks with known answers; success rate and cost per file.

### Stage 12 — Credit cards _(outline)_

- **12.1 [HUMAN] Sample:** an anonymized card statement (Bancolombia or Nu); expand this stage's phases from it. Onboarding's second step gains the credit card option, left out in 5.8.
- **12.2 Parser:** with reconciliation (previous balance + purchases + interest + fees − payments = new balance).
- **12.3 Account and card reconciliation:** match payments from the savings account with the payments in the card statement, without double counting.
- **12.4 Usury rate:** a monthly Inngest cron reads the official publication (source confirmed at the gate), stores the rate per month with its source, and compares it with the card's rates.
- **12.5 Card insights:** interest paid, fees, insurance, and a minimum-payment simulation (deterministic math; the LLM only explains it); and, moved from 6.6, the savings account's card payments without a card statement, with an invitation to upload it.

### Stage 13 — "Pregúntale a tu extracto": chat agent _(outline)_

- **13.1 Typed tools:** `getTransactions`, `getSpendingByCategory`, `getRecurring`, `getSummary`, `findTransactions`; the user id always comes from the session, never from the model.
- **13.2 Agent:** LangGraph.js: understand the question → choose tools → compute → answer. No model-generated SQL.
- **13.3 UI:** streaming answers, the transactions used, and "how it was calculated". Onboarding's first step gains "Responde con tus propios datos", left out in 5.8.
- **13.4 Hardening:** descriptions are untrusted data (prompt injection); output validation; limit of 30 questions per day.
- **13.5 Evals:** question and answer pairs with deterministic answers over the fixtures.
- **13.6 (Optional) Sandbox:** Pyodide in a Web Worker for questions the tools can't answer; the data never leaves the browser.

### Stage 14 — Machine learning (`ml/`) _(outline)_

Follows the `ml/` rules.

- **14.1 Scaffold:** uv, ruff, pyright, pytest and the folder structure from the rules; a CI job for `ml/`.
- **14.2 Dataset:** a TypeScript script exports anonymized labeled descriptions (user corrections, high-confidence LLM labels, synthetic data) to `ml/data/raw`. Only data from consenting users, starting with the developer's own.
- **14.3 Baseline and split:** the rule-based categorizer's results as the baseline; split by statement with a fixed seed.
- **14.4 Training:** a TF-IDF and logistic regression pipeline, tracked in MLflow.
- **14.5 Evaluation:** per-category metrics, coverage above the confidence threshold, `docs/models/categorizer.md`.
- **14.6 Export:** ONNX, manifest and golden file in `packages/models`.
- **14.7 Inference in Node:** onnxruntime-node in the ingestion function (verify the bundle size on Vercel), parity test, chain rules → model → LLM; measure the reduction in LLM calls.
- **14.8 Anomaly detection:** Isolation Forest for unusual charges (duplicates, atypical amounts), with the same export and parity process.

### Stage 15 — RAG and vector search _(outline)_

- **15.1 Corpus:** public sources (4x1000 exemption rules, usury rate definitions, published bank fees) with URLs and retrieval dates.
- **15.2 Index:** chunking, embeddings and pgvector behind a `VectorStore` interface.
- **15.3 Retrieval evals:** questions with known source chunks; recall@k and MRR.
- **15.4 Pinecone:** a second `VectorStore` implementation, the same evals, and an ADR comparing quality, latency, cost and operations.
- **15.5 Cited answers:** the chat answers with citations and says it doesn't know when retrieval is weak.

### Stage 16 — Portfolio polish _(outline)_

Phases 16.0a to 16.0d were pulled forward by the human on 2026-10-15 and come before 5.7a: a promo video and a waitlist page, published on its own, to gather the first people who will try the private beta and give feedback. The other stages keep their order.

#### 16.0a Promo video

**Goal:** a video of under a minute that shows what the first version will do, for the waitlist page and social networks.

**Tasks**

- `apps/video`, a Remotion app (ADR 0020) that renders locally and is never deployed: Remotion Studio and a render script; CI only checks its types and lint.
- Seven scenes built from design v8 with invented data: the bank's cryptic lines, uploading the Excel (read in the browser, balance verified), the three colors (income, real spending, moved), categories, recurring payments, movements with the bank's text, category and channel, and a closing with the tagline and the waitlist. Only what stages 0 to 7 bring, "Ejemplo con datos ficticios" on screen, and no logo of another bank or company.
- Two compositions, 16:9 (1920×1080) for the page and 9:16 (1080×1920) for social networks, with a calm track from Pixabay (git-ignored: its license forbids sharing it on its own) and effects a script synthesizes. A voice-over can come later.
- The 16:9 render and its poster go to `apps/web/public/video/`; the vertical one stays out of the repository.

**Done when:** both formats render under 60 seconds, the 16:9 file weighs under about 6 MB and plays in Chrome and Safari, and the human approved it in Remotion Studio.

**Commit:** `feat(video): promo video for the waitlist`

#### 16.0b Waitlist entries and join form

**Tasks**

- `waitlist_entries` in `@xtrakto/db`: name, normalized and unique email, and the consent's time and version, set by the server. Forced RLS and only `INSERT` for the application, which can't read, change or delete the list (ADR 0021); the insert names no conflict target, since one needs `SELECT`.
- A public `joinWaitlist` action, the first without a session (an exception in the rules, decided by the human): Zod with a required consent, the same answer for a repeated email, and nothing logged.
- `/waitlist` with the form of the human's design (PDF "Xtrakto — Landing lista de espera": name, email, the consent and its text, the button disabled until it is checked) and `/waitlist/joined`, both public. Text input and checkbox join the design system.

**Done when:** database tests prove the application can only add entries and a repeated email changes nothing; the action rejects a missing consent; the form works with the keyboard and at phone width.

**Commit:** `feat(web): join the waitlist`

#### 16.0c Waitlist landing page

**Tasks**

- The rest of the human's design: the header with "Unirme a la lista", the hero with the colored headline and "Tu trimestre, de un vistazo", the video ("Míralo en un minuto") with its poster and no autoplay, "Lo que vas a poder hacer" and the footer.
- The proxy lets the video through without a session.

**Done when:** the page matches the design at desktop and phone widths, the video plays without a session, and the page's metadata carries Open Graph.

**Commit:** `feat(web): waitlist landing page`

#### 16.0d Waitlist-only deployment

Pulled forward by the human on 2026-10-15: only the waitlist goes public on xtrakto.site, before Stage 7 (ADR 0022). It takes from 7.1 the Vercel project, the domain and `docs/deployment.md`, and from 7.2 the production database; Clerk, Inngest, the webhook and the CI migrations job stay in 7.2.

**Tasks**

- `WAITLIST_ONLY=1`: the proxy sends every path but the waitlist's to it, without Clerk, and the server validates only `DATABASE_URL`.
- Clerk out of the root layout, into the app's and sign-in's; `robots.txt` and a sitemap.
- **Human-assisted:** the production database on Neon's `main` (application role, migrations), the Vercel project from `main` with `apps/web` as its root, xtrakto.site and www in Hostinger's DNS.

**Done when:** `https://xtrakto.site` shows the waitlist without a session, any other path leads to it, someone can join, and the application role still can't read the list.

**Commit:** `feat(web): waitlist-only deployment`

#### Later phases

- **16.1 Landing page:** in Spanish, with a clear privacy message. It grows from the waitlist page (16.0c).
- **16.2 Final README:** architecture diagram, ADR index, eval results, cost per statement, p50 and p95 latency.
- **16.3 [HUMAN] Write-up and video:** a technical post and a short demo, which can start from the promo video (16.0a).
- **16.4 Public launch checklist:** scan the git history for secrets and real data (for example with gitleaks), rotate keys, legal review of the privacy page, make the repository public.

---

## Appendix A — Bank formats

Observed on real files. Values below are illustrative; no real data.

### A.1 Bancolombia savings account — quarterly statement (spreadsheet)

- A single sheet. Every cell is **text**, amounts, dates and the account number included. Some exports start with an empty row and others don't.
- Blocks are found by the label in the first column (row positions may vary). Each block is a label row, a header row and a values row, with an empty row between blocks:
  1. `Información Cliente:` → header `CLIENTE | DIRECCIÓN | CIUDAD` → one value row. Use only the holder's name; never output the address or city.
  2. `Información General:` → header `DESDE | HASTA | TIPO CUENTA | NRO CUENTA | SUCURSAL` → values such as `2026/06/30 | 2026/09/30 | CUENTA DE AHORROS | <11 digits> | SUCURSAL <CITY>`. Keep only the last 4 digits of the account.
  3. `Resumen:` → header `SALDO ANTERIOR | TOTAL ABONOS | TOTAL CARGOS | SALDO ACTUAL | SALDO PROMEDIO | CUPO SUGERIDO | INTERESES | RETEFUENTE` → text amounts with `,` as the thousands separator and `.` as the decimal separator (`1,234,567.89`, `.00`). `SALDO PROMEDIO` has no decimals (`9,876,543`), and `TOTAL CARGOS` is printed as a positive amount.
  4. `Movimientos:` → header `FECHA | DESCRIPCIÓN | SUCURSAL | DCTO. | VALOR | SALDO`, then one row per movement:
     - `FECHA`: `d/mm` without a year (`1/07`, `29/09`). The year comes from the period.
     - `DESCRIPCIÓN`: mostly uppercase, but names and PSE entities can come in mixed case (`TRANSF A Ana Prueba`, `PAGO PSE Banco Ejemplo S`); truncated to about 30 characters, sometimes with double spaces (`COMPRA EN  MERCADO XYZ`). Older statements split a description into two cells where the text has `ñí`, as in `Compañía`: `PAGO PSE Ejemplo Compa` and then `¡a de Finan` in the next cell, which shifts the rest of the row one column to the right. The parser joins the cells and restores `ñí`; newer statements write `Compania` in one cell.
     - `SUCURSAL` and `DCTO.`: usually empty; `SUCURSAL` sometimes names the channel (`CANAL CORRESPONSA`).
     - `VALOR`: signed text amount (`-15,000.00`, `12.34`).
     - `SALDO`: balance after the movement, as text.
- The statement is split into **pages** of about 50 movements. Each new page repeats the `Información Cliente:`, `Información General:` and `Movimientos:` blocks (not `Resumen:`) right after the last movement, without an empty row; the repeated `DESDE` header puts the word `SUCURSAL` in the `VALOR` column. Skip rows whose `FECHA` doesn't match `d/mm`.
- The table ends with a row that has `FIN ESTADO DE CUENTA` in the `DESCRIPCIÓN` column.
- The period can start on the last day of the previous month (`2026/06/30`, first movement on `1/07`). Back-to-back statements share that day: one ends on the day the next starts, and the next opens with its closing balance (three pairs of real files, 5.6c).
- One `ABONO INTERESES AHORROS` row on most days (about 90 per quarter, very small amounts), not always the first row of its day; after a day without one, the next row covers both days.
- **Invariants verified on a real file:** every row satisfies previous balance + `VALOR` = `SALDO` to the cent; the sum of positive values equals `TOTAL ABONOS`; the sum of negative values equals `TOTAL CARGOS` with the opposite sign; `SALDO ANTERIOR` + sum = `SALDO ACTUAL`.

### A.2 Bancolombia — movements export ("Descargar movimientos", Excel)

- Downloaded from the account detail in online banking. The user picks any range of dates (a month, two weeks, a few days) within the current month and the previous three. Available as PDF or Excel.
- A single sheet; the first row is the header `Fecha | Descripción | Referencia | Valor`.
- `Fecha`: real date cells with time 05:00, which is local midnight in `America/Bogota` stored as UTC. Convert to the local date.
- `Descripción`: the same text as in the quarterly statement.
- `Referencia`: a text cell (leading zeros kept), often empty. For `TRANSFERENCIAS A NEQUI` it is the recipient's mobile number (10 digits starting with 3) → PII, must be hashed. For ATM withdrawals, `ATM <location>`, longer than the description; for QR and key payments, a 10-digit code with leading zeros (sometimes empty); for PSE, a 9-digit number; for `TRANSFERENCIA CTA SUC VIRTUAL`, the destination account number → PII; for utilities, one or more contract numbers separated by spaces.
- `Valor`: numeric cell, signed.
- **No balance column, no account number and no period.** Rows are ordered newest first; within a day, the order doesn't follow the quarterly statement's.
- Saving the export as CSV from Excel turns dates into `d/mm/yyyy` text and amounts into text with a decimal comma (`11,24`), in Windows-1252 with `;`. Parsers read the Excel file.
- **Cross-check with the quarterly statement (real files):** the same movements, descriptions, amounts and total, with two differences:
  - This export dates `ABONO INTERESES AHORROS` on the day the interest was paid: **the next day**, or the same day for a month's last day, which then holds two interest rows. So a range includes the interest of the day before it starts and leaves out the interest of its last day, unless that day ends a month.
  - Where a description has an accented letter, the quarterly statement can cut it just before that letter while this export keeps it (`PAGO LLAVE COMIDAS R` and `PAGO LLAVE COMIDAS RÁ`; one real case).

### A.3 Bancolombia — quarterly statement (PDF)

- Password-protected, usually with the holder's ID number.
- Plain text extraction is unusable: from page 2 on, columns come out as separate blocks (all dates, then all descriptions, then all amounts), and some lines from two movements merge into one. Rows must be rebuilt from the positions of the text items.
- The spreadsheet export of the same statement is the ground truth for the PDF parser's tests.

### A.4 Credit cards

No sample yet (Phase 12.1).

---

## Appendix B — Description patterns (Bancolombia)

Starting point for the rule-based categorizer (`CATEGORIZATION_RULES` in `@xtrakto/core`, Phase 6.1a). Verify each pattern against the real files (privately) before relying on it. "Review" means a best guess the quick review asks about by group (design v8, Phase 6.3); categories and best guesses follow v8, as Phase 6.1a sets them. A rule says which way the money goes, so a text with the other sign gets no category.

| Pattern (normalized)                        | Meaning                                                | Category                                                                          | Notes                                                                                                                                                                                                                                                            |
| ------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ABONO INTERESES AHORROS`                   | Daily savings interest                                 | `interest`                                                                        | Grouped per month in the UI                                                                                                                                                                                                                                      |
| `INTERES INV VIRT <number>`                 | Investment interest                                    | `interest`                                                                        | `SUCURSAL` says `VIRTUAL`; the parser masks the account number (ADR 0012)                                                                                                                                                                                        |
| `APERTURA INV VIRTUAL …`                    | Opening of a virtual investment                        | `investment`                                                                      | Internal                                                                                                                                                                                                                                                         |
| `PAGO INTERBANC <ORIGIN>`                   | Incoming transfer from another bank (e.g. salary)      | `income_transfer`                                                                 |                                                                                                                                                                                                                                                                  |
| `CONSIGNACION CORRESPONSAL …`               | Cash deposit at a banking agent                        | `own_account_transfer`, review                                                    | Most likely the user's own cash (moved, design v8); a payment to them is income (`deposit`)                                                                                                                                                                      |
| `TRANSF DE <NAME>`                          | Incoming transfer                                      | `income_transfer`                                                                 | `own_account_transfer` (moved +, never income) with the holder's name: whole words from the first name to a surname, or to review when the bank cut it                                                                                                           |
| `TRANSF A <NAME>`                           | Outgoing transfer                                      | `transfers_to_people`                                                             | `own_account_transfer` with the holder's name, as for `TRANSF DE`; a utility written this way → `utilities`                                                                                                                                                      |
| `TRANSF QR <NAME>`                          | Transfer to a person by QR                             | `transfers_to_people`                                                             | Channel QR; seen in real files                                                                                                                                                                                                                                   |
| `TRANSFERENCIAS A NEQUI`                    | Transfer to a Nequi wallet (reference = phone)         | `transfers_to_people`; review with a phone number                                 | Was `digital_wallet` before v8. Only movements exports carry the number, which the user marks as theirs (internal) or someone else's (6.3d)                                                                                                                      |
| `TRANSFERENCIA DESDE NEQUI`                 | Money in from a Nequi wallet                           | `own_account_transfer`, review                                                    | Most likely the user's own Nequi (moved +, design v8); someone else's: income                                                                                                                                                                                    |
| `TRANSFERENCIA CTA SUC VIRTUAL`             | Transfer through the virtual branch                    | `transfers_to_people` (out), `income_transfer` (in)                               | Ambiguous; let the user correct it                                                                                                                                                                                                                               |
| `PAGO SUC VIRT TC <BRAND> …`                | Credit card payment                                    | `credit_card_payment`                                                             | Internal                                                                                                                                                                                                                                                         |
| `PAGO PSE <ENTITY>`                         | Online payment through PSE                             | Depends on the entity                                                             | Utility → `utilities`; investment platform → `investment`, bank or fintech → `credit_card_payment` (cards first: NU is a financing company too), lender → `loan_payment`, those three with review; a known merchant → its category; any other → `other_spending` |
| `PAGO LLAVE <NAME>`                         | Bre-B instant payment to a key (person, business, app) | `investment` with savings or investment words, else `transfers_to_people`; review | To the holder's own name → `own_account_transfer`; a platform may be the user's investment or savings (moved); redact the name before any LLM call                                                                                                               |
| `PAGO QR <MERCHANT>`                        | QR payment at a merchant                               | Depends on the merchant                                                           | Merchant names truncated; a utility → `utilities`, a known merchant → its category, any other → `other_spending`                                                                                                                                                 |
| `COMPRA EN <MERCHANT>`                      | Card purchase                                          | Depends on the merchant                                                           | About 10 characters of merchant name; a utility → `utilities`, a known merchant → its category, any other → `other_spending`                                                                                                                                     |
| contains `BOLD`, `EBANX` or `DLOCAL`        | Payment through a gateway                              | `payment_gateways`                                                                | Also PayU, Wompi, ePayco, PlacetoPay and Mercado Pago; the bank doesn't say the store, so let the user name it. Money in through one is the user's own sale                                                                                                      |
| `RETIRO CAJERO …` / `RETIRO CORRESPONSAL …` | Cash withdrawal                                        | `cash_withdrawal`                                                                 |                                                                                                                                                                                                                                                                  |
| contains `4X1000`                           | Financial transactions tax (GMF)                       | `taxes_and_fees`                                                                  | Feeds the 4x1000 insight                                                                                                                                                                                                                                         |
| `COMIS …` / `AJUSTE …`                      | Bank fee or adjustment                                 | `taxes_and_fees`                                                                  | A fee such as one for a withdrawal at another bank's ATM (`COMIS RETIRO CAJERO …`); money out; seen in real files                                                                                                                                                |
| `0`                                         | No description from the bank                           | `other_spending` (out), `other_income` (in); review                               | Shown as "Sin descripción del banco"; seen in real files                                                                                                                                                                                                         |
