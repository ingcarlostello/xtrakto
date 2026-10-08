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
5. Update this file: tick the phase in section 5 and add an entry to the phase log (section 7) with what was done, deviations and follow-ups.
6. Stage the changes and propose a Conventional Commit message. Commit only after the human approves. Never push unless asked.
7. Stop and wait for "continue".

**Phase size:** a phase must fit in one reviewable commit. If it grows beyond roughly 400 changed lines (excluding fixtures, lockfiles and generated files), split it into sub-phases (2.4a, 2.4b…), update this file and ask for approval.

**Branches:** until CI exists (Phase 0.7), work on `main`. After that, one branch, one commit and one pull request per phase. Branch names follow `<type>/<phase>-<short-description>`, with the Conventional Commit type and the phase id: `docs/0.8-readme-adr`, `feat/1.2-money-minor-units`.

**Conflicts:** if this roadmap contradicts the project rules, the rules win. Point out the conflict and propose an update to this file.

**Outlined stages:** stages 8 to 16 are outlines. Before starting one, expand each of its phases into the same format as the detailed ones (goal, tasks, done when, commit) and get approval.

**Real data:** never read, print, paste or commit real financial data. Real files may only live in git-ignored `fixtures/private/` folders and be used by private tests that print no content (Phase 2.8).

**Decisions:** when a phase makes a decision worth remembering, record it as an ADR in `docs/adr/`.

---

## 2. Product brief

**Xtrakto** turns a bank statement into a plain-language explanation of where the money went.

- **Users:** people in Colombia first (Bancolombia); more banks and countries later.
- **Language:** the UI is in Spanish (`es-CO`) with amounts in COP. Code and documentation are in English.
- **Key insight:** banks report total debits, but much of that is not spending. Xtrakto separates:
  - **Real spending:** purchases, bills, loan payments, cash withdrawals, transfers to other people.
  - **Money that only moved:** transfers between the user's own accounts, investments and credit card payments (the card's spending belongs to the card statement).
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
5. **Data isolation:** all financial tables use forced Row-Level Security through a transaction-local `app.user_id` setting, in addition to filtering by `userId` in every query. The `users` table (identity mapping only, no financial data) is the only exception.
6. **Third-party identifiers** (such as phone numbers in the `Referencia` column) are stored only as HMAC-SHA-256 with a secret key. A plain hash of a phone number can be reversed by brute force.
7. **The account holder's name** is stored normalized on the account to detect transfers between the user's own accounts. It is never logged or sent to an LLM.
8. **Services:** Vercel (app and Inngest functions), Inngest Cloud, Clerk, PostgreSQL (provider chosen at gate 3.1); later Langfuse, Sentry, PostHog and Resend. Domain: `xtrakto.site`, DNS managed at Hostinger.
9. **Development machine:** macOS on Intel (`darwin-x64`), Node 22 via nvm, pnpm 12.9.1. Some packages ship native binaries; if one has no `darwin-x64` build, stop and report instead of working around it. Node 22 reaches end of life in April 2027: plan the upgrade before then.
10. **TypeScript 6.0 across the monorepo.** TypeScript 7 has no JavaScript compiler API yet, so typescript-eslint (which supports TS `<6.1`) and the Next.js ESLint config can't use it. Move to TypeScript 7 when typescript-eslint supports it.

---

## 4. Decision gates

The human decides before the phase starts. The agent may propose options with trade-offs.

| Gate                | Phase | Options                                                                                                                                         |
| ------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Spreadsheet library | 2.2   | SheetJS from its official distribution (the `xlsx` package on the npm registry is outdated) or ExcelJS. Must work in Node and in a Web Worker.  |
| PostgreSQL provider | 3.1   | Neon (recommended: serverless, database branches for previews) or Supabase.                                                                     |
| Design direction    | 4.3   | One of the design canvas versions: v3 (lime with striped bars), v4 (soft and warm), v5 (black card with pastels). The human shares screenshots. |
| LLM providers       | 8.1   | Primary and fallback provider.                                                                                                                  |
| Credit card sample  | 12.1  | An anonymized card statement provided by the human.                                                                                             |
| Usury rate source   | 12.4  | Official publication confirmed by the human.                                                                                                    |

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
- [ ] 2.3 Synthetic fixtures
- [ ] 2.4 Bancolombia quarterly statement parser
- [ ] 2.5 Statement reconciliation
- [ ] 2.6 Bancolombia movements export parser
- [ ] 2.7 Format detection
- [ ] 2.8 [HUMAN] Private verification with real files

**Stage 3 — Database (`packages/db`)**

- [ ] 3.1 [HUMAN] Database provider and local PostgreSQL
- [ ] 3.2 Package scaffold and migration tooling
- [ ] 3.3 Schema v1
- [ ] 3.4 Row-Level Security and user context
- [ ] 3.5 Persistence functions and dev seed

**Stage 4 — Web app foundations (`apps/web`)**

- [ ] 4.1 Environment validation
- [ ] 4.2 UI base: shadcn/ui and root layout
- [ ] 4.3 [HUMAN] Design direction and tokens
- [ ] 4.4 [HUMAN] Authentication with Clerk
- [ ] 4.5 User lifecycle and data deletion
- [ ] 4.6 App shell and empty states

**Stage 5 — First end-to-end slice: spreadsheet ingestion**

- [ ] 5.1 Inngest setup
- [ ] 5.2 Extraction in a Web Worker
- [ ] 5.3 Upload screen
- [ ] 5.4 Submit action and ingestion job
- [ ] 5.5 Ingestion function
- [ ] 5.6 Ingestion status screen
- [ ] 5.7 Transactions page

**Stage 6 — Deterministic insights**

- [ ] 6.1 Rule-based categorizer
- [ ] 6.2 Real spending vs money that moved
- [ ] 6.3 Category corrections and "this is mine"
- [ ] 6.4 Summary computations
- [ ] 6.5 Recurring payments
- [ ] 6.6 Insights ("Para revisar")
- [ ] 6.7 Summary page

**Stage 7 — First deployment (private beta)**

- [ ] 7.1 [HUMAN] Domain xtrakto.site on Vercel
- [ ] 7.2 [HUMAN] Production services
- [ ] 7.3 Error monitoring with Sentry
- [ ] 7.4 Product analytics with PostHog
- [ ] 7.5 Data flow document and privacy page
- [ ] 7.6 Export my data

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

- [ ] 16.1 Landing page
- [ ] 16.2 Final README with architecture and results
- [ ] 16.3 [HUMAN] Technical write-up and demo video
- [ ] 16.4 Public launch checklist

---

## 6. Stages and phases

Every phase's "Done when" implicitly includes: `pnpm turbo check-types lint test` passes, the progress checklist and the phase log are updated.

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

#### 2.4 Bancolombia quarterly statement parser

**Tasks**

- Implement Appendix A.1. Find blocks by their labels, not by fixed row numbers.
- Read the period, account type, last 4 digits of the account, summary values and holder name. Read movements until `FIN ESTADO DE CUENTA`, skipping repeated headers and other non-movement rows (with a warning for unexpected rows).
- Amounts with `parseAmountText`, dates with `inferDayMonthDate`, descriptions normalized (keeping the raw text too).
- Never output the address, the city or the full account number.

**Done when:** all quarterly fixtures produce the expected output; each quirk in Appendix A.1 has its own test.

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
- Integration tests run against the local database and are skipped when it isn't available.

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

- `lib/env.ts` with Zod schemas for server and client variables; the app fails to start if one is missing or invalid.
- `.env.example` updated.

**Commit:** `feat(web): validated environment variables`

#### 4.2 UI base: shadcn/ui and root layout

**Tasks**

- Initialize shadcn/ui; root layout with `lang="es"`, metadata and the app name.
- No visual decisions yet: neutral defaults until Phase 4.3.

**Commit:** `feat(web): shadcn/ui and root layout`

#### 4.3 [HUMAN] Design direction and tokens

**Human:** choose the design version (gate) and share screenshots.

**Tasks**

- Translate the design into Tailwind theme tokens (colors, radii, typography, spacing) and document them in `docs/design.md`.
- Adapt the base components needed by the app (card, button, badge, KPI tile).
- A development-only page shows the tokens and components.

**Done when:** the development page matches the reference; text contrast meets WCAG AA.

**Commit:** `feat(web): design tokens and base components`

#### 4.4 [HUMAN] Authentication with Clerk

**Human:** create the Clerk application and add the development keys to `.env.local`.

**Tasks**

- `@clerk/nextjs` with Spanish localization; sign-in and sign-up pages.
- Protect every app route except the public ones. The interception file's name depends on the Next.js version (`middleware.ts` or `proxy.ts`); follow the docs for the installed version.

**Done when:** an anonymous visitor is redirected to sign-in; a signed-in user reaches the app.

**Commit:** `feat(web): authentication with Clerk`

#### 4.5 User lifecycle and data deletion

**Tasks**

- `getCurrentUserId()` (server only): resolves the Clerk user to the internal id, creating the `users` row on first use.
- `deleteAllUserData(userId)` in `@xtrakto/db`.
- Clerk webhook route for `user.deleted`, verifying the signature, that deletes all the user's data. The endpoint is registered in Clerk in Phase 7.2.
- "Delete my account and data" action in settings.

**Done when:** tests prove deletion removes every row belonging to the user and nothing else.

**Commit:** `feat(web): user lifecycle and data deletion`

#### 4.6 App shell and empty states

**Tasks**

- Layout following the chosen design: navigation with Resumen, Movimientos, Pagos fijos and Subir extracto.
- Empty states that invite the user to upload a statement.
- Server Components only.

**Done when:** every route renders its empty state; navigation works with the keyboard.

**Commit:** `feat(web): app shell and empty states`

---

### Stage 5 — First end-to-end slice: spreadsheet ingestion

#### 5.1 Inngest setup

**Tasks**

- Inngest client and route handler in `apps/web`; a test function.
- Document how to run the local Inngest dev server.

**Done when:** the test function runs from the local dev server.

**Commit:** `feat(web): Inngest setup`

#### 5.2 Extraction in a Web Worker

**Tasks**

- Run `extractSpreadsheet` and `findParser` in a Web Worker so the interface doesn't freeze, with progress and cancellation.
- The file never leaves the browser.

**Done when:** a 10 MB spreadsheet is extracted without blocking the page; the worker's message handling is tested.

**Commit:** `feat(web): spreadsheet extraction in a Web Worker`

#### 5.3 Upload screen

**Tasks**

- Drop zone with type and size validation (10 MB).
- Preview from the local parse: bank, account type, period, number of movements.
- Account selector when the format doesn't identify the account (movements export).
- Privacy panel explaining what happens to the data. Errors in plain Spanish.

**Done when:** each synthetic XLSX shows the right preview; invalid files show a clear message.

**Commit:** `feat(web): upload screen with local preview`

#### 5.4 Submit action and ingestion job

**Tasks**

- `submitStatement` server action: validates the input with Zod and size bounds, checks the session and the monthly statement limit (10), creates the `ingestion_jobs` row with the extracted content, and sends the Inngest event with IDs only.
- Raise the server action body size limit as needed, keeping it under the hosting limit (Vercel Functions accept request bodies up to 4.5 MB).

**Done when:** tests cover validation, the limit and ownership; the event payload contains no content.

**Commit:** `feat(web): submit statement action and ingestion job`

#### 5.5 Ingestion function

**Tasks:** an Inngest function with one step per stage, its logic in plain functions that can be tested without Inngest:

1. Load the job in the user's context.
2. Detect and parse on the server (authoritative).
3. Reconcile.
4. Resolve the account: by bank, type and last 4 digits for the quarterly statement; the account chosen by the user for the movements export. Store the normalized holder name on the account.
5. Prepare rows: fingerprints, hashed references (HMAC); discard raw references.
6. Persist idempotently.
7. Delete `extracted_content`; save counts in `stats`; update the status.

- On final failure: status `failed` with an error code, and the content deleted as well.
- A daily cron function deletes any `extracted_content` older than 24 hours.

**Done when:** an integration test runs the pipeline with a fixture against the local database; re-running it inserts nothing new.

**Commit:** `feat(web): statement ingestion function`

#### 5.6 Ingestion status screen

**Tasks**

- Poll the job status every few seconds through a server action.
- Show the steps from the design: format recognized, personal data protected, movements read, balance verified.
- A Spanish message for each error code; a link to the transactions once finished.

**Commit:** `feat(web): ingestion status screen`

#### 5.7 Transactions page

**Tasks**

- Server Component listing transactions with filters by account and month in `searchParams`, and pagination.
- Formatted amounts and dates.

**Done when:** the page shows the seeded data correctly; filters survive a reload and can be shared as links.

**Commit:** `feat(web): transactions page`

---

### Stage 6 — Deterministic insights

#### 6.1 Rule-based categorizer

**Tasks**

- `categorizeByRules(transaction, context)` in `@xtrakto/core`: an ordered list of rules (pattern → category) built from Appendix B. Returns `null` when no rule applies (the LLM handles those in Stage 8).
- Add it as a step of the ingestion function with `category_source = "rule"`.
- A private test reports, as a percentage only, how many real movements get a category.

**Done when:** every pattern in Appendix B has a test.

**Commit:** `feat(core): rule-based categorizer`

#### 6.2 Real spending vs money that moved

**Tasks**

- The transaction's `kind` comes from its category.
- Detect transfers to or from the account holder by prefix matching against the holder's normalized name, since descriptions truncate names (`TRANSF A <FIRST NAME> <PARTIAL>`).
- References marked by the user as their own (Phase 6.3) also count as internal.

**Done when:** tests cover truncated names and partial matches that must not count.

**Commit:** `feat(core): internal movement detection`

#### 6.3 Category corrections and "this is mine"

**Tasks**

- Change a transaction's category, optionally applying it to every transaction with the same normalized description.
- Mark a reference (for example a Nequi phone number) or a transfer recipient as "my own account".
- Store corrections with `category_source = "user"` and as user rules applied before the global rules on future ingestions.
- These corrections are the labeled data for Stage 14.

**Done when:** actions validate input and ownership; tests cover applying the rules to new data.

**Commit:** `feat(web): category corrections and own-account marking`

#### 6.4 Summary computations

**Tasks:** pure functions over a period's transactions:

- Income, total outflows, real spending, money that moved (by type), spending by category and by month.
- Interest earned, 4x1000 paid, cash and digital wallet total.
- Credit card payments without an uploaded card statement.

**Done when:** tests compare against hand-computed results on the fixtures.

**Commit:** `feat(core): summary computations`

#### 6.5 Recurring payments

**Tasks**

- Detect payments with the same normalized description (or reference hash), a similar amount and a similar day of the month in at least two different months.
- Exact amounts (loan installments) and variable amounts (utilities) must both work.
- Output: label, typical amount, typical day, months seen, last date.

**Done when:** tests cover fixed and variable payments and false positives.

**Commit:** `feat(core): recurring payment detection`

#### 6.6 Insights ("Para revisar")

**Tasks:** typed generators with Spanish templates, numbers computed in code:

- 4x1000 charged (amount and dates), with the suggestion to check whether the account is marked as exempt.
- Savings yield: interest earned vs average balance.
- Money without detail: cash withdrawals plus transfers to digital wallets.
- Credit card payments without a card statement, with an invitation to upload it.
- New recurring payments or increased amounts (needs at least two periods).

**Done when:** each generator is tested and returns nothing when data is insufficient.

**Commit:** `feat(core): insight generators`

#### 6.7 Summary page

**Tasks**

- Following the chosen design: headline (real spending vs total outflows), KPIs, real vs moved bar, categories, month by month, recurring payments and insights.
- Server Components; client components only for interactive charts.
- In the transactions list, group the daily interest rows into one line per period.

**Done when:** the page renders from seeded data, works at phone width and is navigable with the keyboard.

**Commit:** `feat(web): summary page`

---

### Stage 7 — First deployment (private beta)

#### 7.1 [HUMAN] Domain xtrakto.site on Vercel

**Human:** create the Vercel project with `apps/web` as the root directory, add `xtrakto.site` and create the DNS records at Hostinger as Vercel indicates.

**Tasks:** `docs/deployment.md` with the steps followed.

**Done when:** `https://xtrakto.site` serves the app.

**Commit:** `docs: deployment guide`

#### 7.2 [HUMAN] Production services

**Human:** production database, Clerk production instance (it needs the domain), Inngest connected to Vercel, environment variables in Vercel, Clerk webhook endpoint registered.

**Tasks**

- Run migrations against production from a CI job on `main`, with the owner connection string stored as a GitHub secret.
- An environment checklist in `docs/deployment.md`.

**Done when:** a test account can upload a synthetic XLSX in production and see its summary.

**Commit:** `ci: production migrations`

#### 7.3 Error monitoring with Sentry

**Tasks**

- `@sentry/nextjs` without default PII, without session replay, and with a scrubber that removes request bodies, server action arguments, query strings and any description or amount.

**Done when:** the scrubber is tested; a forced error reaches Sentry without sensitive data.

**Commit:** `feat(web): Sentry with PII scrubbing`

#### 7.4 Product analytics with PostHog

**Tasks**

- Explicit events only (`statement_uploaded`, `ingestion_failed`, `summary_viewed`, `category_corrected`) with format ids, row count buckets and error codes. Autocapture and session recording off.
- Analytics only after the user's consent.

**Done when:** events carry no financial or personal data (tested).

**Commit:** `feat(web): privacy-preserving product analytics`

#### 7.5 Data flow document and privacy page

**Tasks**

- `docs/data-flow.md` with a Mermaid diagram: what happens in the browser, what reaches the server, what is stored and for how long, and what each third party receives (Clerk, Inngest, Sentry, PostHog; LLM providers from Stage 8).
- A privacy page in Spanish summarizing it, with deletion instructions. Note: a legal review under Colombian data protection law (Ley 1581 de 2012) is required before the public launch.

**Commit:** `docs: data flow and privacy page`

#### 7.6 Export my data

**Tasks:** CSV export of all the user's transactions from settings, next to the "delete my data" action.

**Done when:** the export contains only the user's data (tested).

**Commit:** `feat(web): export my data`

---

### Stage 8 — LLM layer _(outline)_

**Goal:** one observable, cost-bounded way to call LLMs, and the first LLM features.

- **8.1 [HUMAN] AI module:** `lib/ai` with the Vercel AI SDK, primary and fallback providers, structured output validated with Zod, one retry on the fallback model, timeouts.
- **8.2 Prompts and tracing:** prompts as versioned files; Langfuse records model, tokens, cost and latency, with inputs and outputs masked.
- **8.3 Usage and limits:** `llm_usage` table; per-user monthly cost cap, chat questions per day and request rate (Postgres counters); platform budget alert at 80% and hard stop at 100%.
- **8.4 Evaluation harness:** `packages/evals` with a labeled synthetic set of at least 200 realistic, redacted descriptions; accuracy, macro-F1 and coverage with a threshold. Runs in CI only when prompts or the AI module change, and on demand.
- **8.5 LLM categorization fallback:** unique redacted descriptions in batches; output restricted to category ids with a confidence; a global cache keyed by the redacted normalized description; `category_source = "llm"`.
- **8.6 "Tu extracto, traducido":** a plain-language explanation per distinct description pattern (not per row), cached; counts and amounts inserted by code.

### Stage 9 — PDF statements _(outline)_

- **9.1 Browser extraction:** pdf.js in a Web Worker; ask for the password when the file is encrypted; the password never leaves the browser; output text items with positions.
- **9.2 Layout reconstruction:** text items → rows, grouping by vertical position with a tolerance and assigning columns by the header's horizontal ranges. Synthetic fixtures of text items.
- **9.3 Quarterly statement PDF parser:** Appendix A.3. Private parity test: the PDF and the XLSX of the same statement produce identical transactions.
- **9.4 Edge cases:** wrong password, PDFs without a text layer (scanned), 30-page limit, size limit, each with a clear message.

### Stage 10 — Monthly use and retention _(outline)_

- **10.1 Cross-format deduplication:** match movements-export rows against existing quarterly rows by date, normalized description, amount and occurrence order, allowing one day of difference for `ABONO INTERESES AHORROS`. Never count a movement twice.
- **10.2 Coverage and gaps:** date ranges with data per account, and which range to download (the bank allows the current month and the previous three).
- **10.3 Optional current balance:** when uploading a movements export, the user can enter the current balance to rebuild balances backwards and verify them.
- **10.4 [HUMAN] Email:** Resend with a sending subdomain (for example `mail.xtrakto.site`) and SPF, DKIM and DMARC records at Hostinger. Watch deliverability: some filters distrust the `.site` extension. Monthly reminder through an Inngest cron, with unsubscribe.
- **10.5 Monthly summary email:** "Your summary is ready" with a link; no amounts or descriptions in the email.

### Stage 11 — Unknown formats: ingestion agent _(outline)_

- **11.1 Fingerprints and saved mappings:** fingerprint of a format from its normalized header; `format_mappings` table (global, no user data): column roles, date and amount formats, sign convention.
- **11.2 Mapping proposal:** the LLM receives the header and at most 10 redacted sample rows and proposes a mapping, validated with Zod and checked with a dry-run parse and reconciliation.
- **11.3 Confirmation screen:** when the mapping can't be verified, the user confirms or corrects it. Confirmed mappings are reused deterministically, without the LLM.
- **11.4 Agent with LangGraph.js:** detect → propose → dry run → verify → retry with a stronger model or ask the user, with explicit state.
- **11.5 Evals:** synthetic spreadsheets from other banks with known answers; success rate and cost per file.

### Stage 12 — Credit cards _(outline)_

- **12.1 [HUMAN] Sample:** an anonymized card statement (Bancolombia or Nu); expand this stage's phases from it.
- **12.2 Parser:** with reconciliation (previous balance + purchases + interest + fees − payments = new balance).
- **12.3 Account and card reconciliation:** match payments from the savings account with the payments in the card statement, without double counting.
- **12.4 Usury rate:** a monthly Inngest cron reads the official publication (source confirmed at the gate), stores the rate per month with its source, and compares it with the card's rates.
- **12.5 Card insights:** interest paid, fees, insurance, and a minimum-payment simulation (deterministic math; the LLM only explains it).

### Stage 13 — "Pregúntale a tu extracto": chat agent _(outline)_

- **13.1 Typed tools:** `getTransactions`, `getSpendingByCategory`, `getRecurring`, `getSummary`, `findTransactions`; the user id always comes from the session, never from the model.
- **13.2 Agent:** LangGraph.js: understand the question → choose tools → compute → answer. No model-generated SQL.
- **13.3 UI:** streaming answers, the transactions used, and "how it was calculated".
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

- **16.1 Landing page:** in Spanish, with a clear privacy message.
- **16.2 Final README:** architecture diagram, ADR index, eval results, cost per statement, p50 and p95 latency.
- **16.3 [HUMAN] Write-up and video:** a technical post and a short demo.
- **16.4 Public launch checklist:** scan the git history for secrets and real data (for example with gitleaks), rotate keys, legal review of the privacy page, make the repository public.

---

## 7. Phase log

| Date       | Phase | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Deviations and follow-ups                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-07 | 0.1   | Read-only audit. Node 22.20.0, pnpm 12.9.1, Turborepo 2.11.7, Next.js 16.3.8, React 19.2.8, Tailwind 4.3.3, Prettier 3.9.6. TypeScript 7.0.2 (root, `packages/ui`) and 5.9.3 (`apps/web`); ESLint 10.9.1 (configs) and 9.39.5 (`apps/web`); no Vitest. No `apps/docs` and no `packages/parsers`. `apps/web` came from `create-next-app` as a nested workspace and doesn't use the shared configs. `pnpm install --frozen-lockfile` fails (`ERR_PNPM_IGNORED_BUILDS`, `allowBuilds` placeholder); `turbo test` fails (no task); `check-types`, `lint` and `build` pass with the existing install.                                                                                                                                                                         | TypeScript 7 exports no compiler API (only `version`), so typescript-eslint can't use it: TypeScript 6.0.3 everywhere (decision 10, ADR in 0.9). ESLint 9 everywhere for `eslint-config-next`. Node 22 kept (EOL April 2027). `fixtures/private/` was only ignored at the root (fixed in 0.6, before 2.8). `transpilePackages` dropped from 0.2. Phases 0.2–0.6, 0.9, 1.1 and 2.1 adjusted.                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-10-07 | 0.2   | Removed `packages/ui`, the nested workspace in `apps/web` (lockfile, `pnpm-workspace.yaml`, `packageManager`), template README files and SVGs, and the empty `.npmrc`. `allowBuilds` set to `sharp: false` and `unrs-resolver: false`, so `pnpm install --frozen-lockfile` passes again with a single lockfile. Config packages renamed to `@xtrakto/*`. Root scripts in order, with `test`; `test` task in `turbo.json` using Turborepo's `transit` pattern (tests run in parallel, but their cache depends on dependencies' sources). Spanish placeholder home page.                                                                                                                                                                                                   | ESLint 9 is now marked as unsupported on npm, but even `eslint-config-next` 16.4.0 bundles plugins (react, import, jsx-a11y) that only declare ESLint ≤ 9: re-check at the start of 0.4 by testing `eslint-config-next` on ESLint 10. The root layout still has `lang="en"`, the template metadata, Geist fonts and the default favicon: Phase 4.2.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-10-07 | 0.3   | TypeScript 6.0.3 pinned at the root and in `apps/web`; `@types/node` on `^22`. `base.json` for packages (ES2023, `ESNext` + `Bundler`, `strict`, `noUncheckedIndexedAccess`, `noEmit`, `types: []`); `nextjs.json` adds the DOM libs, `react-jsx`, `incremental`, the Next.js plugin and `types: ["node"]`. `apps/web` extends it and keeps only `paths` and `include`. `react-library.json` removed. `check-types` in `apps/web` is `next typegen && tsc --noEmit` and passes without a previous build; the `check-types` task uses the `transit` pattern.                                                                                                                                                                                                              | TypeScript 6 defaults checked in the compiler: no `@types` package is included unless `types` lists it, and `strict`, `esModuleInterop` and `noUncheckedSideEffectImports` are on. Each config sets `types` explicitly. Isomorphic packages (core, parsers) keep `types: []`, so Node globals can't slip in; server-only packages (db) add `"node"`. Next.js doesn't rewrite a `tsconfig.json` that uses `extends`, so the options it requires live in `nextjs.json`.                                                                                                                                                                                                                                                                                                         |
| 2026-10-07 | 0.4   | `@xtrakto/eslint-config` rebuilt on ESLint 9.39.5 and typescript-eslint 8.71.1, with two presets: `base` (packages: ESLint and typescript-eslint recommended) and `next` (`eslint-config-next` core web vitals and TypeScript). Both add `project-rules.js` and `eslint-config-prettier`. Babel parser, `eslint-plugin-only-warn` and the `react-internal` preset removed. `apps/web` uses the `next` preset; the `lint` task uses the `transit` pattern, so rule changes invalidate the cache. Every rule checked with sample violations on both presets: `any`, `enum` and deep imports are errors; size, depth, parameters and `console` are warnings; tests and fixtures skip the size limits.                                                                       | ESLint 10 tested in an isolated project: `eslint-config-next` 16.3.8 crashes (`react/display-name` calls `context.getFilename`, removed in ESLint 10) unless the React version is pinned in settings, and three of its plugins declare ESLint ≤ 9. Stayed on ESLint 9, which is unsupported upstream but dev-only; move when those plugins support 10. Phase 1.4 adds its generated `categories.constants.ts` to the size-limit override. `no-unused-vars` is a warning in `next` and an error in `base` (each preset's default).                                                                                                                                                                                                                                             |
| 2026-10-07 | 0.5   | Vitest 5.0.3 in `apps/web` with `vite` 8.3.3 (a peer dependency of Vitest 5) and `@vitest/coverage-v8`: Node environment, `@/` alias, `server-only` aliased to an empty module, `passWithNoTests`, text and HTML coverage without thresholds. Scripts `test` and `test:coverage`; the `test` task outputs `coverage/**`. A temporary test (not committed) checked both aliases and the coverage report.                                                                                                                                                                                                                                                                                                                                                                  | Config named `vitest.config.mts`: as `.ts` in a CommonJS package, Vite warns that its upcoming native config loader won't support it. Remove `passWithNoTests` when the app gets its first test.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-10-07 | 0.6   | Prettier 3.9.6 with default options (`.prettierrc.json`), `.prettierignore`, `format` and `format:check` over the whole repository; `.editorconfig`; `.nvmrc` with 22; `engines.node` set to `^22.12.0` (was `>=24`). Single root `.gitignore` (the one in `apps/web` merged into it) with `.env*` except `.env.example`, `**/fixtures/private/`, `ml/data/` and `ml/artifacts/`. Root `.env.example` documented and empty.                                                                                                                                                                                                                                                                                                                                              | The first format run reformatted existing files, mostly Markdown tables in `docs/` and `.claude/rules/`; content unchanged (emphasis markers, padding and lowercase hex colors in CSS examples). `git check-ignore` confirms `packages/parsers/fixtures/private/`, `.env.production` and `ml/data/` are now ignored and `.env.example` is not.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-10-07 | 0.7   | Private GitHub repository `xtrakto` with `main` pushed. `.github/workflows/ci.yml` on pull requests and pushes to `main`: pnpm from `packageManager`, Node from `.nvmrc`, `pnpm install --frozen-lockfile`, `pnpm turbo check-types lint test`, `pnpm format:check`; outdated runs of the same ref are cancelled; read-only token permissions. CI passed on PR #1 (23 s).                                                                                                                                                                                                                                                                                                                                                                                                | From now on, one branch and one pull request per stage, one commit per phase. Stage 0's remaining phases (0.8, 0.9) follow the same rule.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-10-07 | 0.8   | `README.md` with what Xtrakto is, status, stack, monorepo layout, local setup, scripts and links to `docs/`. `docs/adr/README.md` (when and how to write an ADR, statuses, index) and `docs/adr/0000-template.md` (context, decision, alternatives considered, consequences).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Branching changed with the human's approval: one branch, one commit and one pull request per **phase** (not per stage), named `<type>/<phase>-<short-description>`. Updated in section 1 of this roadmap and in section 16 of the project rules. This supersedes the per-stage rule noted in the 0.7 entry.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-10-07 | 0.9   | ADRs 0001–0010 in `docs/adr/`, all Accepted, one page each, based on section 3 of this roadmap, the system design and the Stage 0 findings (0010 cites the 0.1 audit). ADR index filled. The key decisions table in `docs/ARCHITECTURE.md` gets an ADR column that links each decision to its record. Stage 0 complete.                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Decisions without an ADR yet: ESLint 9 until `eslint-config-next` supports ESLint 10 (Phase 0.4 log) and forced Row-Level Security (Phase 3.4, when it is implemented).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-10-07 | 1.1   | `@xtrakto/core` created as the template for later packages: `type: module`, `sideEffects: false`, a single `exports` entry pointing at `src/index.ts`, the shared tsconfig (`base.json`) and ESLint (`base`) presets, Vitest with v8 coverage. `APP_ERROR_CODE` (seven codes), `AppError` (plain object with optional `details`), `Result<T, E = AppError>`, `ok()` and `err()`. 7 tests, including type assertions with `expectTypeOf`; 100% coverage.                                                                                                                                                                                                                                                                                                                  | `AppError` is a plain object, not an `Error` subclass: it must serialize across server actions, and it has no message (the UI maps codes to Spanish text). Deep imports fail twice: TypeScript can't resolve them because of the `exports` map, and ESLint reports them. No `@types/node` needed: core stays free of Node globals. The `test` task's `coverage/**` output was removed: coverage only exists with `test:coverage`, and Turborepo warned on every run.                                                                                                                                                                                                                                                                                                          |
| 2026-10-07 | 1.2   | Money helpers in `@xtrakto/core`: branded `AmountMinor`, `CURRENCY` with `COP` and `Currency`, `parseAmountText` (strict statement format; commas only as thousands separators, up to two decimals), `amountFromNumber`, `sumAmounts` (checks every partial sum) and `formatAmount`. Formatting passes exact decimal text to `Intl.NumberFormat`, never a float. 72 table-driven tests cover negatives, zero, `".00"`, 10^13 COP, invalid text and floating-point traps (`0.29`, `4.35`, `1.15`, `0.1 + 0.2`); 100% line and branch coverage.                                                                                                                                                                                                                            | `amountFromNumber` takes the cell's shortest decimal text; if it has sub-cent digits it strips binary noise (15 significant digits), and real sub-cent values such as `1.005` are rejected, never rounded. Numeric cells are limited to below 2^46 (about 70 trillion COP): above that, doubles can't hold cents. Text amounts reach the full safe range (about 90 trillion COP). `formatAmount` follows the design system instead of plain `Intl` output for `es-CO` (`$ 8.119.555,00`): no space after the symbol, a real minus sign (U+2212), and decimals only when there are cents. A `+` sign for income is left to the UI (Phase 6.7). Parsing assumes two minor digits, which holds for COP; a currency with another exponent would need the currency as a parameter. |
| 2026-10-07 | 1.3   | Date helpers in `@xtrakto/core` on `date-fns` 4.4.0 and `@date-fns/tz` 1.5.0, core's first runtime dependencies: branded `LocalDate`, `Period` (both ends included), `DEFAULT_TIME_ZONE` (`America/Bogota`), `compareLocalDates`, `isWithinPeriod`, `localDateFromInstant`, `localDateFromExcelSerial` with `ExcelDateTimeZones`, `parseSlashDate` and `inferDayMonthDate`. 62 tests cover 05:00 UTC → same day in Bogotá (and 04:59 UTC → the previous day), year rollover, leap years (no 29/02 in 2027), invalid input and ambiguous dates; 100% coverage. The suite passes with the machine in UTC, Bogotá, UTC+14, UTC−11, São Paulo and Kathmandu.                                                                                                                 | Excel serials below 61 (1900-03-01) are rejected: Excel counts a nonexistent 1900-02-29, inherited from Lotus 1-2-3. A `d/mm` that occurs twice in the period (only possible in periods longer than a year) returns `ambiguous` instead of guessing. `localDateFromInstant` throws on an invalid instant or time zone, since both come from code. Parse errors use `details.reason`: `format`, `range`, `out_of_period` or `ambiguous`.                                                                                                                                                                                                                                                                                                                                       |
| 2026-10-07 | 1.4   | `packages/core/categories.json` as the single source of truth: the three kinds (`spending`, `income`, `internal`) and the roadmap's 24 categories with Spanish labels. `scripts/generate-categories.mjs` (`pnpm --filter @xtrakto/core generate:categories`) writes `src/categories.constants.ts` (`CATEGORY_KINDS` and `CATEGORIES` as `as const`, with a "do not edit" header); `Category`, `CategoryId` and `CategoryKind` are derived from it. 8 tests: unique kinds and ids, snake_case ids, valid kinds, non-empty labels, every kind used, generated file in sync with the JSON, and literal types.                                                                                                                                                               | The kinds live in the JSON too, so Python reads the same list. The generator is plain JavaScript: in TypeScript it would need `@types/node` in core, which must stay free of Node globals. Its output already follows Prettier's style, so it needs no Prettier dependency, and running it twice gives the same file. The freshness test compares data, not text: editing the JSON without regenerating fails with the command to run (checked). The 0.4 follow-up, a size-limit override for the generated file, isn't needed yet: it has 126 lines. The Spanish labels are a first draft for the human to review.                                                                                                                                                           |
| 2026-10-07 | 1.5a  | Phase 1.5 split into 1.5a and 1.5b (estimated at about 500 lines), approved by the human. Zod 4.6.5 added to core. `isAmountMinor` and `isLocalDate` type guards; `amountMinorSchema`, `currencySchema`, `localDateSchema` and `periodSchema` (end not before start; the error points at `to`). `extractedContentSchema`: a discriminated union on `type` (`spreadsheet` or `pdf`), strict objects, cells as text, number, `null` or `{ excelSerial }`, and size bounds in `extracted-content.constants.ts`. 63 tests, including each size bound at its limit and one past it; 100% coverage.                                                                                                                                                                            | The base schemas use `z.custom` with the type guards so they return the project's own `LocalDate` and `AmountMinor`, not Zod brands; `periodSchema` is checked against `Period` with `satisfies`. Untrusted content uses strict objects: unknown keys are rejected instead of silently dropped. Zod issues don't copy input values, so amounts can't leak into logs through validation errors. The bounds per structure don't cap the total size; the request body limit does (Phase 5.4). The size constants stay internal until a consumer needs them (for example the 30-page message in Phase 9.4).                                                                                                                                                                       |
| 2026-10-07 | —     | Refactor outside the phases, requested by the human: `@xtrakto/core`'s 25 source files grouped by domain module in `src/result/`, `src/money/`, `src/dates/`, `src/categories/` and `src/extracted-content/`; only `src/index.ts` stays at the root. Imports, the category generator's output path and the JSON import in the categories test updated. No behavior change: the same 212 tests pass, and the regenerated `categories.constants.ts` is identical to the previous one. The convention is now in section 5 of the project rules (`src/<module>/<name>.<role>.ts`, tests next to the file, no barrel per folder).                                                                                                                                             | `parsers` and `db` follow the same structure: Phase 2.1 places `bank-parser.types.ts` in a module folder and updates the example path in section 2 of the project rules.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-10-07 | 1.5b  | The parsed statement contract in `packages/core/src/statements/`: `ACCOUNT_TYPE`, `PERIOD_SOURCE`, `REFERENCE_KIND` and `PARSE_WARNING_CODE` (`UNEXPECTED_ROW`); `parsedTransactionSchema`, `parsedStatementSchema` and `parseWarningSchema`, with inferred types (`ParsedTransaction`, `ParsedStatement`, `ParseWarning`, `AccountType`, `PeriodSource`, `ReferenceKind`, `ParseWarningCode`). Strict objects, kebab-case ids, `accountLast4` exactly four digits, text bounded by the cell length (500) and lists by the row limit (10,000). 38 tests: a quarterly statement, a movements export and an empty statement; every required field; each invalid field; the list bounds; and type assertions (dates are `LocalDate`, amounts `AmountMinor`). 100% coverage. | Parser output uses strict objects too: an extra field such as the holder's address is rejected, a guard against PII leaks. No cross-field rules: transactions aren't required to fall inside the period, because card statements (Stage 12) list purchases dated before the billing cycle; reconciliation (Phase 2.5) checks consistency. Totals are documented as printed in the summary, and Phases 2.4–2.5 fix their sign with the fixtures. `PARSE_WARNING_CODE` starts with one code; parsers add codes as they need them.                                                                                                                                                                                                                                               |
| 2026-10-07 | —     | Brand kit added, requested by the human: the "Cinta plegada" logo. `docs/brand.md` (brand guide) and `docs/brand/brand-sheet.png`; logo SVGs and PNG exports in `apps/web/public/brand/`; PWA icons in `apps/web/public/icons/`; `favicon.ico` (replaces the create-next-app one), `icon.svg`, `apple-icon.png` and `opengraph-image.png` with its alt text in `apps/web/src/app/`, which Next.js picks up on its own. Design system §2: wordmark letter-spacing from `0.34em` to `0.3em`, and a Logo row that points to `docs/brand.md`. `CLAUDE.md` asks to read `docs/brand.md` before any UI with the logo, metadata, icons or brand colors.                                                                                                                         | The kit cited `docs/design.md`, which doesn't exist: its references now point to `.claude/rules/design-system.md`, the actual design system. Phase 4.3 still says to document tokens in `docs/design.md`; decide there whether the rules file stays the single source. The `Logo` component, the root metadata (`metadataBase`, title template, viewport) and `manifest.ts` wait for the UI phases (4.2, 4.6), with reference code in `docs/brand.md` §8. The placeholder home page still uses `0.34em` until then.                                                                                                                                                                                                                                                           |
| 2026-10-07 | 1.6   | `redactPii(text, { knownNames })` in `packages/core/src/pii/` with `PII_PLACEHOLDER`: emails → `[EMAIL]`, Colombian mobiles (10 digits starting with 3, optional +57) → `[PHONE]`, runs of 6+ digits → `[NUMBER]`, the name after `TRANSF A`, `TRANSF DE` and `PAGO LLAVE` → `[NAME]`, and known names (the holder) anywhere, also when truncated at the end of the text (at least 4 letters). Merchant names are kept. 25 table-driven tests with synthetic descriptions; 100% coverage.                                                                                                                                                                                                                                                                                | Rules run in order (emails, phones, numbers, transfer names, known names), so `PAGO LLAVE 3001234567` keeps `[PHONE]`. Name matching uses Unicode word edges and escapes the name, so symbols in a name are matched as text. Documented limitations: numbers with separators or under 6 digits, names outside a transfer prefix that are not in `knownNames`, and accent differences.                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-10-07 | 1.7   | `hashIdentifier(value, key)` in `packages/core/src/hashing/`: HMAC-SHA-256 with Web Crypto, as 64 hex characters, after normalizing the value (Colombian mobiles to their 10 digits, with or without +57 and separators; other identifiers in NFC, uppercase and with collapsed spaces). `MIN_IDENTIFIER_HASH_KEY_LENGTH` (32) exported for the environment validation in Phase 4.1. `IDENTIFIER_HASH_KEY` documented in `.env.example`, with how to generate it and why it must stay stable. 17 tests: reference vectors computed with `node:crypto` (an implementation independent of the code under test), different keys give different hashes, equivalent spellings give the same hash, and an empty value or a short key throws. 100% coverage. Stage 1 complete.  | Web Crypto and `TextEncoder` types come from the DOM or Node libraries, which core leaves out; the module declares only the subset it uses and reads them from `globalThis`, so core stays free of platform globals and still type-checks inside programs that include the DOM. An empty value or a short key throws (bugs, not bad input): hashing an empty reference would group unrelated movements. The key is imported on every call; cache it if ingestion profiling shows the cost matters.                                                                                                                                                                                                                                                                            |
| 2026-10-07 | 2.1   | `@xtrakto/parsers` copies core's structure (one `exports` entry, shared tsconfig and ESLint presets); it depends only on `@xtrakto/core`, which TypeScript and Vitest read from source with no build step. `BankParser` in `src/registry/bank-parser.types.ts`: `id` (the format id), `bankId`, `canParse(content)` and `parse(content)` → `Result<ParsedStatement>`. `createParserRegistry(parsers)` returns a `ParserRegistry` whose `findParser(content)` gives the first parser, in order, that recognizes the content, or `UNKNOWN_FORMAT`; a repeated id throws. `normalizeDescription` in `src/descriptions/` trims and collapses any whitespace (tabs, line breaks, non-breaking spaces) into one space. 21 tests with two test-only parsers; 100% coverage.     | No ready-made `findParser` is exported yet: with no real parser it would always return `UNKNOWN_FORMAT`; Phase 2.4 builds the registry with its parser. The registry is a fixed list, not a `register()` call: with `sideEffects: false`, a bundler could drop registration done on import. First match wins; 2.7 makes sure each format matches exactly one parser. `normalizeDescription` skips Unicode normalization (NFC), unlike `hashIdentifier`; revisit for PDF text (Stage 9) or cross-format deduplication (10.1). The section 2 example in the project rules now shows the real path and contract: it used `RawFile` and `ParseResult`, which don't exist (parsers receive `ExtractedContent`, ADR 0008). README: Stage 2 status and `parsers` in the layout.      |
| 2026-10-08 | 2.2   | SheetJS 0.20.3, chosen at the gate (ADR 0011), installed in `@xtrakto/parsers` from its official CDN; the lockfile pins its integrity hash. `extractSpreadsheet(bytes)` in `src/extraction/` returns `SpreadsheetContent` from XLSX (ZIP signature) or CSV (UTF-8, or Windows-1252 as Excel saves it in Spanish). Cells keep their position (`null` when empty; trailing empty cells and rows dropped); date cells, found by their number format, become `{ excelSerial }` in the 1900 system, also from 1904 workbooks; formulas keep their saved result; CSV values stay text. Errors: `UNKNOWN_FORMAT` (`file_type`), `PARSE_FAILED`, and `INVALID_INPUT` (`too_large`) with the bounds the server checks. 27 tests; 100% coverage.                                   | No script writes XLSX files: the tests build each synthetic workbook in memory with SheetJS, so no binaries are committed and the tests need no Node APIs; files for manual uploads can come with 5.3. Only XLSX and CSV are accepted: SheetJS also reads legacy XLS, XLSB, ODS and HTML, but ODS dates go through `Date` and each format needs its own tests. Booleans become `TRUE`/`FALSE` and error cells `null`, since a cell can't hold either. SheetJS writes into its options, so each read builds new ones. A browser build of the package pulls in no Node module; the real worker comes in 5.2. ADR 0011 is Accepted: the human decided at the gate. About 500 changed lines, 300 of them tests: kept as one phase, approved by the human.                         |

---

## Appendix A — Bank formats

Observed on real files. Values below are illustrative; no real data.

### A.1 Bancolombia savings account — quarterly statement (spreadsheet)

- A single sheet. Amounts are **text cells**.
- Blocks are found by the label in the first column (row positions may vary):
  1. `Información Cliente:` → header `CLIENTE | DIRECCIÓN | CIUDAD` → one value row. Use only the holder's name; never output the address or city.
  2. `Información General:` → header `DESDE | HASTA | TIPO CUENTA | NRO CUENTA | SUCURSAL` → values such as `2026/06/30 | 2026/09/30 | CUENTA DE AHORROS | <11 digits> | SUCURSAL <CITY>`. Keep only the last 4 digits of the account.
  3. `Resumen:` → header `SALDO ANTERIOR | TOTAL ABONOS | TOTAL CARGOS | SALDO ACTUAL | SALDO PROMEDIO | CUPO SUGERIDO | INTERESES | RETEFUENTE` → text amounts with `,` as the thousands separator and `.` as the decimal separator (`1,234,567.89`, `.00`, and sometimes no decimals: `9,876,543`).
  4. `Movimientos:` → header `FECHA | DESCRIPCIÓN | SUCURSAL | DCTO. | VALOR | SALDO`, then one row per movement:
     - `FECHA`: `d/mm` without a year (`1/07`, `29/09`). The year comes from the period.
     - `DESCRIPCIÓN`: uppercase, truncated to about 30 characters, sometimes with double spaces (`COMPRA EN  MERCADO XYZ`).
     - `SUCURSAL` and `DCTO.`: usually empty.
     - `VALOR`: signed text amount (`-15,000.00`, `12.34`).
     - `SALDO`: balance after the movement, as text.
- The movements table may contain **repeated header rows** and other non-movement rows in the middle (for example the word `SUCURSAL` where an amount is expected). Skip rows whose `FECHA` doesn't match `d/mm`.
- The table ends with a row containing `FIN ESTADO DE CUENTA`.
- The period can start on the last day of the previous month (`2026/06/30`, first movement on `1/07`).
- One `ABONO INTERESES AHORROS` row per day (about 90 per quarter, very small amounts).
- **Invariants verified on a real file:** every row satisfies previous balance + `VALOR` = `SALDO` to the cent; the sum of positive values equals `TOTAL ABONOS`; the sum of negative values equals `TOTAL CARGOS`; `SALDO ANTERIOR` + sum = `SALDO ACTUAL`.

### A.2 Bancolombia — movements export ("Descargar movimientos", Excel)

- Downloaded from the account detail in online banking. The user picks the dates; the bank allows the current month and the previous three. Available as PDF or Excel.
- A single sheet; the first row is the header `Fecha | Descripción | Referencia | Valor`.
- `Fecha`: real date cells with time 05:00, which is local midnight in `America/Bogota` stored as UTC. Convert to the local date.
- `Descripción`: the same text as in the quarterly statement.
- `Referencia`: often empty. For `TRANSFERENCIAS A NEQUI` it is the recipient's mobile number (10 digits starting with 3) → PII, must be hashed. For ATM withdrawals, the ATM location; for QR, key and PSE payments, a numeric code; for utilities, a contract number.
- `Valor`: numeric cell, signed.
- **No balance column, no account number and no period.** Rows are ordered newest first.
- **Cross-check with the quarterly statement for the same month (real files):** the same movements, descriptions, amounts and total, except the `ABONO INTERESES AHORROS` rows, which this export dates **one day later**.

### A.3 Bancolombia — quarterly statement (PDF)

- Password-protected, usually with the holder's ID number.
- Plain text extraction is unusable: from page 2 on, columns come out as separate blocks (all dates, then all descriptions, then all amounts), and some lines from two movements merge into one. Rows must be rebuilt from the positions of the text items.
- The spreadsheet export of the same statement is the ground truth for the PDF parser's tests.

### A.4 Credit cards

No sample yet (Phase 12.1).

---

## Appendix B — Description patterns (Bancolombia)

Starting point for the rule-based categorizer. Verify each pattern against the real files (privately) before relying on it.

| Pattern (normalized)                        | Meaning                                           | Category                | Notes                                                                                      |
| ------------------------------------------- | ------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| `ABONO INTERESES AHORROS`                   | Daily savings interest                            | `interest`              | Group in the UI                                                                            |
| contains `INTERES` and `INV`                | Investment interest                               | `interest`              | Verify exact text                                                                          |
| `APERTURA INV VIRTUAL …`                    | Opening of a virtual investment                   | `investment`            | Internal                                                                                   |
| `PAGO INTERBANC <ORIGIN>`                   | Incoming transfer from another bank (e.g. salary) | `income_transfer`       |                                                                                            |
| `CONSIGNACION CORRESPONSAL …`               | Cash deposit at a banking agent                   | `deposit`               |                                                                                            |
| `TRANSF DE <NAME>`                          | Incoming transfer                                 | `income_transfer`       | `own_account_transfer` if the name matches the holder                                      |
| `TRANSF A <NAME>`                           | Outgoing transfer                                 | `transfers_to_people`   | `own_account_transfer` if the name matches the holder; some utilities also appear this way |
| `TRANSFERENCIAS A NEQUI`                    | Transfer to a Nequi wallet (reference = phone)    | `digital_wallet`        | Internal if the phone is marked as the user's own                                          |
| `TRANSFERENCIA CTA SUC VIRTUAL`             | Transfer through the virtual branch               | `transfers_to_people`   | Ambiguous; let the user correct it                                                         |
| `PAGO SUC VIRT TC <BRAND> …`                | Credit card payment                               | `credit_card_payment`   | Internal                                                                                   |
| `PAGO PSE <ENTITY>`                         | Online payment through PSE                        | Depends on the entity   | Card at another bank → `credit_card_payment`; utility → `utilities`; bank → ask the user   |
| `PAGO LLAVE <NAME>`                         | Instant payment to a key (person or business)     | `transfers_to_people`   | Redact the name before any LLM call                                                        |
| `PAGO QR <MERCHANT>`                        | QR payment at a merchant                          | Depends on the merchant | Merchant names truncated                                                                   |
| `COMPRA EN <MERCHANT>`                      | Card purchase                                     | Depends on the merchant | About 10 characters of merchant name                                                       |
| `RETIRO CAJERO …` / `RETIRO CORRESPONSAL …` | Cash withdrawal                                   | `cash_withdrawal`       |                                                                                            |
| contains `4X1000`                           | Financial transactions tax (GMF)                  | `taxes_and_fees`        | Feeds the 4x1000 insight                                                                   |
