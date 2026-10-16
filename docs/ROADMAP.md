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
- [ ] 5.7c Search and "No cuadra"
- [ ] 5.8 Onboarding _(design v8)_

**Stage 6 — Deterministic insights**

- [ ] 6.1 Rule-based categorizer
- [ ] 6.2 Real spending vs money that moved
- [ ] 6.3 Category corrections and "this is mine"
- [ ] 6.4 Summary computations
- [ ] 6.5 Recurring payments
- [ ] 6.6 Insights ("Para revisar")
- [ ] 6.7 Summary page
- [ ] 6.8 Categories page _(design v8)_

**Stage 7 — First deployment (private beta)**

- [ ] 7.1 [HUMAN] Domain xtrakto.site on Vercel
- [ ] 7.2 [HUMAN] Production services
- [ ] 7.3 Error monitoring with Sentry
- [ ] 7.4 Product analytics with PostHog
- [ ] 7.5 Data flow document and privacy page
- [ ] 7.6 Export my data
- [ ] 7.7 Profile _(design v8)_
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

#### 5.7c Search and "No cuadra"

**Tasks**

- Search by description (ignoring case and accents) or by amount typed the Colombian way ("$90.000"), within the period.
- "Ver dónde no cuadra": the rows of a quarterly statement that doesn't reconcile, with the row that breaks marked; the list warns when its period has one, and the upload result links to it.
- Later phases add the kind tiles and filters, channel tags and "Por revisar" (6.1, 6.2), the detail panel (6.3), interest grouped per month (6.7), "También aparece como" and source files (10.1), and "Descargar CSV" (7.6).

**Done when:** search and the "No cuadra" view work and survive a reload.

**Commit:** `feat(web): search and balance breaks in movements`

#### 5.8 Onboarding _(added with design v8)_

**Tasks**

- The three steps of `docs/ui/v8-15` to `v8-17`, each with "Saltar", with copy true today: what Xtrakto does; what to upload first (the quarterly statement, recommended, or the month's movements) for a Bancolombia savings account, without asking for the name, which comes from the statement; then the download paths of both formats next to the drop zone. No credit cards, other banks or sample data yet.
- Shown once: Clerk sends the user there right after sign-up, and nothing is stored (decided with the human).

**Done when:** a new user goes through the steps or skips them and lands on the upload screen; the steps work at phone width and with the keyboard.

**Commit:** `feat(web): onboarding`

---

### Stage 6 — Deterministic insights

#### 6.1 Rule-based categorizer

**Tasks**

- `categorizeByRules(transaction, context)` in `@xtrakto/core`: an ordered list of rules (pattern → category) built from Appendix B. Returns `null` when no rule applies (the LLM handles those in Stage 8).
- Categories as design v8 shows them (`docs/ui/v8-05`), confirmed by the human, changing `categories.json` and its generated constants: a new `payment_gateways` ("Pasarelas de pago": Bold, Ebanx, dLocal, where the bank doesn't say the store); `transfers_to_people` becomes "Pagos a personas" and takes in `digital_wallet` (a Nequi send is a payment to a person unless the number is the user's, then it moved); labels "Créditos", "Efectivo", "Restaurantes y domicilios", "Servicios del hogar", "Costos del banco" (4x1000, fees and adjustments) and "Otros".
- A rule gives its best guess and says whether the movement needs review: Bre-B _llave_ payments, PSE payments to fintechs, transfers to the holder's truncated name, deposits at a _corresponsal_, money in from the user's name or Nequi. Stored so the quick review (6.3) can group them, which changes the schema.
- Each rule carries the reason shown in the movement's detail ("Regla del sistema, sin IA"), and the channel tag comes from the description's prefix (design system §9).
- Add it to the ingestion function, inside its `ingest` transaction or as a step that reads and writes by ids (ADR 0019), with `category_source = "rule"`.
- A private test reports, as a percentage only, how many real movements get a category and how many need review.

**Done when:** every pattern in Appendix B has a test.

**Commit:** `feat(core): rule-based categorizer`

#### 6.2 Real spending vs money that moved

**Tasks**

- The transaction's `kind` comes from its category.
- Detect transfers to or from the account holder by prefix matching against the holder's normalized name, since descriptions truncate names (`TRANSF A <FIRST NAME> <PARTIAL>`).
- References marked by the user as their own (Phase 6.3) also count as internal.
- Moved goes both ways (design v8): money back from the user's own Nequi or name is moved (+), never income.
- Keep the holder's name and the truncated forms seen in transfers, for "Cómo te escribe el banco" (`docs/ui/v8-11`).
- Onboarding's first step gains "Separa lo que gastaste de lo que solo moviste", left out in 5.8.

**Done when:** tests cover truncated names and partial matches that must not count.

**Commit:** `feat(core): internal movement detection`

#### 6.3 Category corrections and "this is mine"

**Tasks**

- The quick review of design v8 (`docs/ui/v8-02`): the movements that need review, asked by group, with the best guess as the suggested answer; Nequi numbers with an "Es mío" switch; answered groups collapse, and "Lo que está en juego" shows what each answer would change. The summary shows a review banner while groups are pending.
- The detail panel of `v8-03`, moved here from 5.7: the movement's real fields (date, amount, "Así lo escribe el banco", reference, balance after, source statement) and its kind and category with the reason, which the user can change, optionally for every transaction with the same normalized description ("Aplicar a los 3 parecidos").
- Mark a reference (for example a Nequi phone number, a card or an investment platform) or a transfer recipient as "my own account", and undo it.
- Store answers and corrections with `category_source = "user"` and as user rules applied before the global rules on future ingestions ("Tus reglas", `v8-05`).
- These corrections are the labeled data for Stage 14.
- Probably beyond 400 lines: expect to split it into the quick review and the corrections.

**Done when:** actions validate input and ownership; tests cover applying the rules to new data.

**Commit:** `feat(web): category corrections and own-account marking`

#### 6.4 Summary computations

**Tasks:** pure functions over a period's transactions:

- Income (without the money that came back from the user's own accounts), total outflows, real spending, money that moved (by type, out and back), spending by category and by month, each with its count.
- Interest earned, 4x1000 paid, cash total.
- Credit card payments without an uploaded card statement.
- The bank's own figures for the account card: average balance and interest paid, from the quarterly statement.
- A quarterly statement that doesn't reconcile stays out of every figure until it does (decided with the human, Phase 5.5); on its days, the movements exports' rows count instead, if there are any. Every figure uses Stage 5's predicate for the movements that count.

**Done when:** tests compare against hand-computed results on the fixtures.

**Commit:** `feat(core): summary computations`

#### 6.5 Recurring payments

**Tasks**

- Detect payments with the same normalized description (or reference hash), a similar amount and a similar day of the month in at least three consecutive months (design v8: "Necesitamos 3 meses para encontrarlos"; the roadmap said two months before v8, and the human confirmed the change), even when the bank writes it differently or it's paid through another channel.
- Exact amounts (loan installments) and variable amounts (utilities) must both work.
- Output: label, typical amount, typical day or range of days, channels, months seen, last date, and how the amount moves ("Estable", "Varía poco", "Monto variable", "Subió 12%").
- What repeats but isn't spending (card payments, savings) goes in a list of its own (`docs/ui/v8-04`).

**Done when:** tests cover fixed and variable payments and false positives.

**Commit:** `feat(core): recurring payment detection`

#### 6.6 Insights ("Para revisar")

**Tasks:** typed generators with Spanish templates, numbers computed in code:

- 4x1000 charged (amount and dates), with the suggestion to check whether the account is marked as exempt.
- Savings yield: interest earned vs average balance.
- Money without detail: cash withdrawals, and payments through gateways that hide the store ("6 pagos sin tienda identificada", `docs/ui/v8-05`).
- Credit card payments without a card statement, with an invitation to upload it.
- New recurring payments or increased amounts (needs at least two periods).

**Done when:** each generator is tested and returns nothing when data is insufficient.

**Commit:** `feat(core): insight generators`

#### 6.7 Summary page

**Tasks**

- Following design v8 (`docs/ui/v8-01`): headline (real spending vs total outflows), KPIs, real vs moved bar, categories, month by month, recurring payments and insights, the review banner, and the account card with the bank's own figures and its status pill.
- The KPI tile (stat card with its progress ring, design system §9), moved here from 4.3.
- Server Components; client components only for interactive charts.
- In the transactions list, group the daily interest rows into one line per month.
- Onboarding's welcome example gets its kind rings back, left out in 5.8.

**Done when:** the page renders from seeded data, works at phone width and is navigable with the keyboard.

**Commit:** `feat(web): summary page`

#### 6.8 Categories page _(added with design v8)_

**Tasks**

- `docs/ui/v8-05`: real spending by category, largest first, each with its share and count; "Movido no es gasto", with money out (to the investment, the accounts, the cards) and money back; payments through gateways without a store, with a prompt to name them; the user's rules from the quick review.
- `docs/ui/v8-06`: a category's detail, grouping the different ways the bank writes the same place ("Dónde más").
- Categorías joins the dock.

**Done when:** the page renders from seeded data, works at phone width and is navigable with the keyboard.

**Commit:** `feat(web): categories page`

---

### Stage 7 — First deployment (private beta)

#### 7.1 [HUMAN] Domain xtrakto.site on Vercel

**Human:** create the Vercel project with `apps/web` as the root directory, add `xtrakto.site` and create the DNS records at Hostinger as Vercel indicates.

**Tasks:** `docs/deployment.md` with the steps followed.

**Done when:** `https://xtrakto.site` serves the app.

**Commit:** `docs: deployment guide`

#### 7.2 [HUMAN] Production services

**Human:** production database, Clerk production instance (it needs the domain) with "Allow users to delete their account" off (User & authentication → User model; `/settings` deletes the data first), Inngest connected to Vercel, environment variables in Vercel, Clerk webhook endpoint registered.

**Tasks**

- Run migrations against production from a CI job on `main`, with the owner connection string stored as a GitHub secret.
- An environment checklist in `docs/deployment.md`.

**Done when:** a test account can upload a synthetic XLSX in production and see its summary.

**Commit:** `ci: production migrations`

#### 7.2b End-to-end tests with Playwright (pending)

Pending from Phase 4.5: a browser test of the account deletion flow, with a dedicated Clerk test account and the CI browser installed. The happy-dom regression test of the hook runs in every CI job meanwhile.

**Commit:** `test(web): end-to-end tests with Playwright`

#### 7.3 Error monitoring with Sentry

**Tasks**

- `@sentry/nextjs` without default PII, without session replay, and with a scrubber that removes request bodies, server action arguments, query strings (Movimientos keeps search terms in `q`) and any description or amount.

**Done when:** the scrubber is tested; a forced error reaches Sentry without sensitive data.

**Commit:** `feat(web): Sentry with PII scrubbing`

#### 7.4 Product analytics with PostHog

**Tasks**

- Explicit events only (`statement_uploaded`, `ingestion_failed`, `summary_viewed`, `category_corrected`) with format ids, row count buckets and error codes. Autocapture and session recording off.
- Analytics only after the user's consent.

**Done when:** events carry no financial or personal data, and no URLs with search terms (tested).

**Commit:** `feat(web): privacy-preserving product analytics`

#### 7.5 Data flow document and privacy page

**Tasks**

- `docs/data-flow.md` with a Mermaid diagram: what happens in the browser, what reaches the server, what is stored and for how long, and what each third party receives (Clerk, Inngest, Sentry, PostHog; LLM providers from Stage 8).
- A privacy page in Spanish summarizing it, with deletion instructions. Note: a legal review under Colombian data protection law (Ley 1581 de 2012) is required before the public launch.

**Commit:** `docs: data flow and privacy page`

#### 7.6 Export my data

**Tasks:** CSV export of all the user's transactions from settings, next to the "delete my data" action ("Descargar mis datos (CSV)", `docs/ui/v8-11`), and of the selected period from Movimientos ("Descargar CSV", `v8-03`).

**Done when:** the export contains only the user's data (tested).

**Commit:** `feat(web): export my data`

#### 7.7 Profile _(added with design v8)_

**Tasks**

- `/settings` becomes "Tu perfil" (`docs/ui/v8-11`): the Xtrakto account ("Administrar inicio de sesión"), how the bank writes the holder's name (6.2), the accounts and references marked as the user's (6.3), plan usage (statements this month, questions today), the privacy facts, "Descargar mis datos (CSV)" (7.6), "Borrar todos mis datos" (4.5, with the white destructive button of design system §9) and the session.
- Perfil joins the dock, as v8 shows, and the avatar menu's "Configuración" link (Phase 4.6) goes away (decided with the human). The coverage timeline arrives with 10.2 and the email notices with 10.4.

**Done when:** every section shows the user's data or its empty state, works at phone width and is navigable with the keyboard.

**Commit:** `feat(web): profile page`

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
- **12.5 Card insights:** interest paid, fees, insurance, and a minimum-payment simulation (deterministic math; the LLM only explains it).

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

Starting point for the rule-based categorizer. Verify each pattern against the real files (privately) before relying on it. "Review" means a best guess the quick review asks about by group (design v8, Phase 6.3); categories follow v8, as Phase 6.1 sets them.

| Pattern (normalized)                        | Meaning                                                | Category                | Notes                                                                                                       |
| ------------------------------------------- | ------------------------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `ABONO INTERESES AHORROS`                   | Daily savings interest                                 | `interest`              | Grouped per month in the UI                                                                                 |
| `INTERES INV VIRT <number>`                 | Investment interest                                    | `interest`              | `SUCURSAL` says `VIRTUAL`; the parser masks the account number (ADR 0012)                                   |
| `APERTURA INV VIRTUAL …`                    | Opening of a virtual investment                        | `investment`            | Internal                                                                                                    |
| `PAGO INTERBANC <ORIGIN>`                   | Incoming transfer from another bank (e.g. salary)      | `income_transfer`       |                                                                                                             |
| `CONSIGNACION CORRESPONSAL …`               | Cash deposit at a banking agent                        | `deposit`, review       | The user's own cash (moved) or a payment to them (income)                                                   |
| `TRANSF DE <NAME>`                          | Incoming transfer                                      | `income_transfer`       | `own_account_transfer` (moved +, never income) if the name matches the holder, also cut; review when unsure |
| `TRANSF A <NAME>`                           | Outgoing transfer                                      | `transfers_to_people`   | `own_account_transfer` if the name matches the holder; some utilities also appear this way                  |
| `TRANSF QR <NAME>`                          | Transfer to a person by QR                             | `transfers_to_people`   | Channel QR; seen in real files                                                                              |
| `TRANSFERENCIAS A NEQUI`                    | Transfer to a Nequi wallet (reference = phone)         | `transfers_to_people`   | Was `digital_wallet` before v8. Internal if the phone is marked as the user's own                           |
| `TRANSFERENCIA DESDE NEQUI`                 | Money in from a Nequi wallet                           | review                  | The user's own Nequi: moved (+), not income; someone else's: income                                         |
| `TRANSFERENCIA CTA SUC VIRTUAL`             | Transfer through the virtual branch                    | `transfers_to_people`   | Ambiguous; let the user correct it                                                                          |
| `PAGO SUC VIRT TC <BRAND> …`                | Credit card payment                                    | `credit_card_payment`   | Internal                                                                                                    |
| `PAGO PSE <ENTITY>`                         | Online payment through PSE                             | Depends on the entity   | Card at another bank → `credit_card_payment`; utility → `utilities`; fintech or bank → review               |
| `PAGO LLAVE <NAME>`                         | Bre-B instant payment to a key (person, business, app) | review                  | A platform may be the user's investment or savings (moved); redact the name before any LLM call             |
| `PAGO QR <MERCHANT>`                        | QR payment at a merchant                               | Depends on the merchant | Merchant names truncated                                                                                    |
| `COMPRA EN <MERCHANT>`                      | Card purchase                                          | Depends on the merchant | About 10 characters of merchant name                                                                        |
| contains `BOLD`, `EBANX` or `DLOCAL`        | Payment through a gateway                              | `payment_gateways`      | The bank doesn't say the store; let the user name it                                                        |
| `RETIRO CAJERO …` / `RETIRO CORRESPONSAL …` | Cash withdrawal                                        | `cash_withdrawal`       |                                                                                                             |
| contains `4X1000`                           | Financial transactions tax (GMF)                       | `taxes_and_fees`        | Feeds the 4x1000 insight                                                                                    |
| `0`                                         | No description from the bank                           | review                  | Shown as "Sin descripción del banco"; seen in real files                                                    |
