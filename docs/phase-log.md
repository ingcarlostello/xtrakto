# Xtrakto — Phase log

What each phase of [the roadmap](ROADMAP.md) did, its deviations from the plan and its follow-ups, oldest first. Add an entry at the end when a phase closes (roadmap section 1, step 5).

---

## 0.1 Audit the repository (read-only)

_2026-10-07_

Read-only audit. Node 22.20.0, pnpm 12.9.1, Turborepo 2.11.7, Next.js 16.3.8, React 19.2.8, Tailwind 4.3.3, Prettier 3.9.6. TypeScript 7.0.2 (root, `packages/ui`) and 5.9.3 (`apps/web`); ESLint 10.9.1 (configs) and 9.39.5 (`apps/web`); no Vitest. No `apps/docs` and no `packages/parsers`. `apps/web` came from `create-next-app` as a nested workspace and doesn't use the shared configs. `pnpm install --frozen-lockfile` fails (`ERR_PNPM_IGNORED_BUILDS`, `allowBuilds` placeholder); `turbo test` fails (no task); `check-types`, `lint` and `build` pass with the existing install.

**Deviations and follow-ups:** TypeScript 7 exports no compiler API (only `version`), so typescript-eslint can't use it: TypeScript 6.0.3 everywhere (decision 10, ADR in 0.9). ESLint 9 everywhere for `eslint-config-next`. Node 22 kept (EOL April 2027). `fixtures/private/` was only ignored at the root (fixed in 0.6, before 2.8). `transpilePackages` dropped from 0.2. Phases 0.2–0.6, 0.9, 1.1 and 2.1 adjusted.

## 0.2 Clean up the boilerplate

_2026-10-07_

Removed `packages/ui`, the nested workspace in `apps/web` (lockfile, `pnpm-workspace.yaml`, `packageManager`), template README files and SVGs, and the empty `.npmrc`. `allowBuilds` set to `sharp: false` and `unrs-resolver: false`, so `pnpm install --frozen-lockfile` passes again with a single lockfile. Config packages renamed to `@xtrakto/*`. Root scripts in order, with `test`; `test` task in `turbo.json` using Turborepo's `transit` pattern (tests run in parallel, but their cache depends on dependencies' sources). Spanish placeholder home page.

**Deviations and follow-ups:** ESLint 9 is now marked as unsupported on npm, but even `eslint-config-next` 16.4.0 bundles plugins (react, import, jsx-a11y) that only declare ESLint ≤ 9: re-check at the start of 0.4 by testing `eslint-config-next` on ESLint 10. The root layout still has `lang="en"`, the template metadata, Geist fonts and the default favicon: Phase 4.2.

## 0.3 Shared TypeScript configuration

_2026-10-07_

TypeScript 6.0.3 pinned at the root and in `apps/web`; `@types/node` on `^22`. `base.json` for packages (ES2023, `ESNext` + `Bundler`, `strict`, `noUncheckedIndexedAccess`, `noEmit`, `types: []`); `nextjs.json` adds the DOM libs, `react-jsx`, `incremental`, the Next.js plugin and `types: ["node"]`. `apps/web` extends it and keeps only `paths` and `include`. `react-library.json` removed. `check-types` in `apps/web` is `next typegen && tsc --noEmit` and passes without a previous build; the `check-types` task uses the `transit` pattern.

**Deviations and follow-ups:** TypeScript 6 defaults checked in the compiler: no `@types` package is included unless `types` lists it, and `strict`, `esModuleInterop` and `noUncheckedSideEffectImports` are on. Each config sets `types` explicitly. Isomorphic packages (core, parsers) keep `types: []`, so Node globals can't slip in; server-only packages (db) add `"node"`. Next.js doesn't rewrite a `tsconfig.json` that uses `extends`, so the options it requires live in `nextjs.json`.

## 0.4 Shared ESLint configuration

_2026-10-07_

`@xtrakto/eslint-config` rebuilt on ESLint 9.39.5 and typescript-eslint 8.71.1, with two presets: `base` (packages: ESLint and typescript-eslint recommended) and `next` (`eslint-config-next` core web vitals and TypeScript). Both add `project-rules.js` and `eslint-config-prettier`. Babel parser, `eslint-plugin-only-warn` and the `react-internal` preset removed. `apps/web` uses the `next` preset; the `lint` task uses the `transit` pattern, so rule changes invalidate the cache. Every rule checked with sample violations on both presets: `any`, `enum` and deep imports are errors; size, depth, parameters and `console` are warnings; tests and fixtures skip the size limits.

**Deviations and follow-ups:** ESLint 10 tested in an isolated project: `eslint-config-next` 16.3.8 crashes (`react/display-name` calls `context.getFilename`, removed in ESLint 10) unless the React version is pinned in settings, and three of its plugins declare ESLint ≤ 9. Stayed on ESLint 9, which is unsupported upstream but dev-only; move when those plugins support 10. Phase 1.4 adds its generated `categories.constants.ts` to the size-limit override. `no-unused-vars` is a warning in `next` and an error in `base` (each preset's default).

## 0.5 Testing setup

_2026-10-07_

Vitest 5.0.3 in `apps/web` with `vite` 8.3.3 (a peer dependency of Vitest 5) and `@vitest/coverage-v8`: Node environment, `@/` alias, `server-only` aliased to an empty module, `passWithNoTests`, text and HTML coverage without thresholds. Scripts `test` and `test:coverage`; the `test` task outputs `coverage/**`. A temporary test (not committed) checked both aliases and the coverage report.

**Deviations and follow-ups:** Config named `vitest.config.mts`: as `.ts` in a CommonJS package, Vite warns that its upcoming native config loader won't support it. Remove `passWithNoTests` when the app gets its first test.

## 0.6 Formatting, editor and ignore files

_2026-10-07_

Prettier 3.9.6 with default options (`.prettierrc.json`), `.prettierignore`, `format` and `format:check` over the whole repository; `.editorconfig`; `.nvmrc` with 22; `engines.node` set to `^22.12.0` (was `>=24`). Single root `.gitignore` (the one in `apps/web` merged into it) with `.env*` except `.env.example`, `**/fixtures/private/`, `ml/data/` and `ml/artifacts/`. Root `.env.example` documented and empty.

**Deviations and follow-ups:** The first format run reformatted existing files, mostly Markdown tables in `docs/` and `.claude/rules/`; content unchanged (emphasis markers, padding and lowercase hex colors in CSS examples). `git check-ignore` confirms `packages/parsers/fixtures/private/`, `.env.production` and `ml/data/` are now ignored and `.env.example` is not.

## 0.7 GitHub repository and CI

_2026-10-07_

Private GitHub repository `xtrakto` with `main` pushed. `.github/workflows/ci.yml` on pull requests and pushes to `main`: pnpm from `packageManager`, Node from `.nvmrc`, `pnpm install --frozen-lockfile`, `pnpm turbo check-types lint test`, `pnpm format:check`; outdated runs of the same ref are cancelled; read-only token permissions. CI passed on PR #1 (23 s).

**Deviations and follow-ups:** From now on, one branch and one pull request per stage, one commit per phase. Stage 0's remaining phases (0.8, 0.9) follow the same rule.

## 0.8 README and ADR scaffolding

_2026-10-07_

`README.md` with what Xtrakto is, status, stack, monorepo layout, local setup, scripts and links to `docs/`. `docs/adr/README.md` (when and how to write an ADR, statuses, index) and `docs/adr/0000-template.md` (context, decision, alternatives considered, consequences).

**Deviations and follow-ups:** Branching changed with the human's approval: one branch, one commit and one pull request per **phase** (not per stage), named `<type>/<phase>-<short-description>`. Updated in section 1 of the roadmap and in section 16 of the project rules. This supersedes the per-stage rule noted in the 0.7 entry.

## 0.9 ADRs for decisions already made

_2026-10-07_

ADRs 0001–0010 in `docs/adr/`, all Accepted, one page each, based on section 3 of the roadmap, the system design and the Stage 0 findings (0010 cites the 0.1 audit). ADR index filled. The key decisions table in `docs/ARCHITECTURE.md` gets an ADR column that links each decision to its record. Stage 0 complete.

**Deviations and follow-ups:** Decisions without an ADR yet: ESLint 9 until `eslint-config-next` supports ESLint 10 (Phase 0.4 log) and forced Row-Level Security (Phase 3.4, when it is implemented).

## 1.1 Package scaffold, Result and AppError

_2026-10-07_

`@xtrakto/core` created as the template for later packages: `type: module`, `sideEffects: false`, a single `exports` entry pointing at `src/index.ts`, the shared tsconfig (`base.json`) and ESLint (`base`) presets, Vitest with v8 coverage. `APP_ERROR_CODE` (seven codes), `AppError` (plain object with optional `details`), `Result<T, E = AppError>`, `ok()` and `err()`. 7 tests, including type assertions with `expectTypeOf`; 100% coverage.

**Deviations and follow-ups:** `AppError` is a plain object, not an `Error` subclass: it must serialize across server actions, and it has no message (the UI maps codes to Spanish text). Deep imports fail twice: TypeScript can't resolve them because of the `exports` map, and ESLint reports them. No `@types/node` needed: core stays free of Node globals. The `test` task's `coverage/**` output was removed: coverage only exists with `test:coverage`, and Turborepo warned on every run.

## 1.2 Money in minor units

_2026-10-07_

Money helpers in `@xtrakto/core`: branded `AmountMinor`, `CURRENCY` with `COP` and `Currency`, `parseAmountText` (strict statement format; commas only as thousands separators, up to two decimals), `amountFromNumber`, `sumAmounts` (checks every partial sum) and `formatAmount`. Formatting passes exact decimal text to `Intl.NumberFormat`, never a float. 72 table-driven tests cover negatives, zero, `".00"`, 10^13 COP, invalid text and floating-point traps (`0.29`, `4.35`, `1.15`, `0.1 + 0.2`); 100% line and branch coverage.

**Deviations and follow-ups:** `amountFromNumber` takes the cell's shortest decimal text; if it has sub-cent digits it strips binary noise (15 significant digits), and real sub-cent values such as `1.005` are rejected, never rounded. Numeric cells are limited to below 2^46 (about 70 trillion COP): above that, doubles can't hold cents. Text amounts reach the full safe range (about 90 trillion COP). `formatAmount` follows the design system instead of plain `Intl` output for `es-CO` (`$ 8.119.555,00`): no space after the symbol, a real minus sign (U+2212), and decimals only when there are cents. A `+` sign for income is left to the UI (Phase 6.7). Parsing assumes two minor digits, which holds for COP; a currency with another exponent would need the currency as a parameter.

## 1.3 Dates: LocalDate and conversions

_2026-10-07_

Date helpers in `@xtrakto/core` on `date-fns` 4.4.0 and `@date-fns/tz` 1.5.0, core's first runtime dependencies: branded `LocalDate`, `Period` (both ends included), `DEFAULT_TIME_ZONE` (`America/Bogota`), `compareLocalDates`, `isWithinPeriod`, `localDateFromInstant`, `localDateFromExcelSerial` with `ExcelDateTimeZones`, `parseSlashDate` and `inferDayMonthDate`. 62 tests cover 05:00 UTC → same day in Bogotá (and 04:59 UTC → the previous day), year rollover, leap years (no 29/02 in 2027), invalid input and ambiguous dates; 100% coverage. The suite passes with the machine in UTC, Bogotá, UTC+14, UTC−11, São Paulo and Kathmandu.

**Deviations and follow-ups:** Excel serials below 61 (1900-03-01) are rejected: Excel counts a nonexistent 1900-02-29, inherited from Lotus 1-2-3. A `d/mm` that occurs twice in the period (only possible in periods longer than a year) returns `ambiguous` instead of guessing. `localDateFromInstant` throws on an invalid instant or time zone, since both come from code. Parse errors use `details.reason`: `format`, `range`, `out_of_period` or `ambiguous`.

## 1.4 Categories as a shared contract

_2026-10-07_

`packages/core/categories.json` as the single source of truth: the three kinds (`spending`, `income`, `internal`) and the roadmap's 24 categories with Spanish labels. `scripts/generate-categories.mjs` (`pnpm --filter @xtrakto/core generate:categories`) writes `src/categories.constants.ts` (`CATEGORY_KINDS` and `CATEGORIES` as `as const`, with a "do not edit" header); `Category`, `CategoryId` and `CategoryKind` are derived from it. 8 tests: unique kinds and ids, snake_case ids, valid kinds, non-empty labels, every kind used, generated file in sync with the JSON, and literal types.

**Deviations and follow-ups:** The kinds live in the JSON too, so Python reads the same list. The generator is plain JavaScript: in TypeScript it would need `@types/node` in core, which must stay free of Node globals. Its output already follows Prettier's style, so it needs no Prettier dependency, and running it twice gives the same file. The freshness test compares data, not text: editing the JSON without regenerating fails with the command to run (checked). The 0.4 follow-up, a size-limit override for the generated file, isn't needed yet: it has 126 lines. The Spanish labels are a first draft for the human to review.

## 1.5a Base schemas and extracted content

_2026-10-07_

Phase 1.5 split into 1.5a and 1.5b (estimated at about 500 lines), approved by the human. Zod 4.6.5 added to core. `isAmountMinor` and `isLocalDate` type guards; `amountMinorSchema`, `currencySchema`, `localDateSchema` and `periodSchema` (end not before start; the error points at `to`). `extractedContentSchema`: a discriminated union on `type` (`spreadsheet` or `pdf`), strict objects, cells as text, number, `null` or `{ excelSerial }`, and size bounds in `extracted-content.constants.ts`. 63 tests, including each size bound at its limit and one past it; 100% coverage.

**Deviations and follow-ups:** The base schemas use `z.custom` with the type guards so they return the project's own `LocalDate` and `AmountMinor`, not Zod brands; `periodSchema` is checked against `Period` with `satisfies`. Untrusted content uses strict objects: unknown keys are rejected instead of silently dropped. Zod issues don't copy input values, so amounts can't leak into logs through validation errors. The bounds per structure don't cap the total size; the request body limit does (Phase 5.4). The size constants stay internal until a consumer needs them (for example the 30-page message in Phase 9.4).

## Outside the phases: Core grouped by module

_2026-10-07_

Refactor outside the phases, requested by the human: `@xtrakto/core`'s 25 source files grouped by domain module in `src/result/`, `src/money/`, `src/dates/`, `src/categories/` and `src/extracted-content/`; only `src/index.ts` stays at the root. Imports, the category generator's output path and the JSON import in the categories test updated. No behavior change: the same 212 tests pass, and the regenerated `categories.constants.ts` is identical to the previous one. The convention is now in section 5 of the project rules (`src/<module>/<name>.<role>.ts`, tests next to the file, no barrel per folder).

**Deviations and follow-ups:** `parsers` and `db` follow the same structure: Phase 2.1 places `bank-parser.types.ts` in a module folder and updates the example path in section 2 of the project rules.

## 1.5b Parsed statement schemas

_2026-10-07_

The parsed statement contract in `packages/core/src/statements/`: `ACCOUNT_TYPE`, `PERIOD_SOURCE`, `REFERENCE_KIND` and `PARSE_WARNING_CODE` (`UNEXPECTED_ROW`); `parsedTransactionSchema`, `parsedStatementSchema` and `parseWarningSchema`, with inferred types (`ParsedTransaction`, `ParsedStatement`, `ParseWarning`, `AccountType`, `PeriodSource`, `ReferenceKind`, `ParseWarningCode`). Strict objects, kebab-case ids, `accountLast4` exactly four digits, text bounded by the cell length (500) and lists by the row limit (10,000). 38 tests: a quarterly statement, a movements export and an empty statement; every required field; each invalid field; the list bounds; and type assertions (dates are `LocalDate`, amounts `AmountMinor`). 100% coverage.

**Deviations and follow-ups:** Parser output uses strict objects too: an extra field such as the holder's address is rejected, a guard against PII leaks. No cross-field rules: transactions aren't required to fall inside the period, because card statements (Stage 12) list purchases dated before the billing cycle; reconciliation (Phase 2.5) checks consistency. Totals are documented as printed in the summary, and Phases 2.4–2.5 fix their sign with the fixtures. `PARSE_WARNING_CODE` starts with one code; parsers add codes as they need them.

## Outside the phases: Brand kit

_2026-10-07_

Brand kit added, requested by the human: the "Cinta plegada" logo. `docs/brand.md` (brand guide) and `docs/brand/brand-sheet.png`; logo SVGs and PNG exports in `apps/web/public/brand/`; PWA icons in `apps/web/public/icons/`; `favicon.ico` (replaces the create-next-app one), `icon.svg`, `apple-icon.png` and `opengraph-image.png` with its alt text in `apps/web/src/app/`, which Next.js picks up on its own. Design system §2: wordmark letter-spacing from `0.34em` to `0.3em`, and a Logo row that points to `docs/brand.md`. `CLAUDE.md` asks to read `docs/brand.md` before any UI with the logo, metadata, icons or brand colors.

**Deviations and follow-ups:** The kit cited `docs/design.md`, which doesn't exist: its references now point to `.claude/rules/design-system.md`, the actual design system. Phase 4.3 still says to document tokens in `docs/design.md`; decide there whether the rules file stays the single source. The `Logo` component, the root metadata (`metadataBase`, title template, viewport) and `manifest.ts` wait for the UI phases (4.2, 4.6), with reference code in `docs/brand.md` §8. The placeholder home page still uses `0.34em` until then.

## 1.6 PII redaction

_2026-10-07_

`redactPii(text, { knownNames })` in `packages/core/src/pii/` with `PII_PLACEHOLDER`: emails → `[EMAIL]`, Colombian mobiles (10 digits starting with 3, optional +57) → `[PHONE]`, runs of 6+ digits → `[NUMBER]`, the name after `TRANSF A`, `TRANSF DE` and `PAGO LLAVE` → `[NAME]`, and known names (the holder) anywhere, also when truncated at the end of the text (at least 4 letters). Merchant names are kept. 25 table-driven tests with synthetic descriptions; 100% coverage.

**Deviations and follow-ups:** Rules run in order (emails, phones, numbers, transfer names, known names), so `PAGO LLAVE 3001234567` keeps `[PHONE]`. Name matching uses Unicode word edges and escapes the name, so symbols in a name are matched as text. Documented limitations: numbers with separators or under 6 digits, names outside a transfer prefix that are not in `knownNames`, and accent differences.

## 1.7 Identifier hashing

_2026-10-07_

`hashIdentifier(value, key)` in `packages/core/src/hashing/`: HMAC-SHA-256 with Web Crypto, as 64 hex characters, after normalizing the value (Colombian mobiles to their 10 digits, with or without +57 and separators; other identifiers in NFC, uppercase and with collapsed spaces). `MIN_IDENTIFIER_HASH_KEY_LENGTH` (32) exported for the environment validation in Phase 4.1. `IDENTIFIER_HASH_KEY` documented in `.env.example`, with how to generate it and why it must stay stable. 17 tests: reference vectors computed with `node:crypto` (an implementation independent of the code under test), different keys give different hashes, equivalent spellings give the same hash, and an empty value or a short key throws. 100% coverage. Stage 1 complete.

**Deviations and follow-ups:** Web Crypto and `TextEncoder` types come from the DOM or Node libraries, which core leaves out; the module declares only the subset it uses and reads them from `globalThis`, so core stays free of platform globals and still type-checks inside programs that include the DOM. An empty value or a short key throws (bugs, not bad input): hashing an empty reference would group unrelated movements. The key is imported on every call; cache it if ingestion profiling shows the cost matters.

## 2.1 Parser contract and registry

_2026-10-07_

`@xtrakto/parsers` copies core's structure (one `exports` entry, shared tsconfig and ESLint presets); it depends only on `@xtrakto/core`, which TypeScript and Vitest read from source with no build step. `BankParser` in `src/registry/bank-parser.types.ts`: `id` (the format id), `bankId`, `canParse(content)` and `parse(content)` → `Result<ParsedStatement>`. `createParserRegistry(parsers)` returns a `ParserRegistry` whose `findParser(content)` gives the first parser, in order, that recognizes the content, or `UNKNOWN_FORMAT`; a repeated id throws. `normalizeDescription` in `src/descriptions/` trims and collapses any whitespace (tabs, line breaks, non-breaking spaces) into one space. 21 tests with two test-only parsers; 100% coverage.

**Deviations and follow-ups:** No ready-made `findParser` is exported yet: with no real parser it would always return `UNKNOWN_FORMAT`; Phase 2.4 builds the registry with its parser. The registry is a fixed list, not a `register()` call: with `sideEffects: false`, a bundler could drop registration done on import. First match wins; 2.7 makes sure each format matches exactly one parser. `normalizeDescription` skips Unicode normalization (NFC), unlike `hashIdentifier`; revisit for PDF text (Stage 9) or cross-format deduplication (10.1). The section 2 example in the project rules now shows the real path and contract: it used `RawFile` and `ParseResult`, which don't exist (parsers receive `ExtractedContent`, ADR 0008). README: Stage 2 status and `parsers` in the layout.

## 2.2 Spreadsheet extraction (gate: library)

_2026-10-08_

SheetJS 0.20.3, chosen at the gate (ADR 0011), installed in `@xtrakto/parsers` from its official CDN; the lockfile pins its integrity hash. `extractSpreadsheet(bytes)` in `src/extraction/` returns `SpreadsheetContent` from XLSX (ZIP signature) or CSV (UTF-8, or Windows-1252 as Excel saves it in Spanish). Cells keep their position (`null` when empty; trailing empty cells and rows dropped); date cells, found by their number format, become `{ excelSerial }` in the 1900 system, also from 1904 workbooks; formulas keep their saved result; CSV values stay text. Errors: `UNKNOWN_FORMAT` (`file_type`), `PARSE_FAILED`, and `INVALID_INPUT` (`too_large`) with the bounds the server checks. 27 tests; 100% coverage.

**Deviations and follow-ups:** No script writes XLSX files: the tests build each synthetic workbook in memory with SheetJS, so no binaries are committed and the tests need no Node APIs; files for manual uploads can come with 5.3. Only XLSX and CSV are accepted: SheetJS also reads legacy XLS, XLSB, ODS and HTML, but ODS dates go through `Date` and each format needs its own tests. Booleans become `TRUE`/`FALSE` and error cells `null`, since a cell can't hold either. SheetJS writes into its options, so each read builds new ones. A browser build of the package pulls in no Node module; the real worker comes in 5.2. ADR 0011 is Accepted: the human decided at the gate. About 500 changed lines, 300 of them tests: kept as one phase, approved by the human.

## 2.3 Synthetic fixtures

_2026-10-08_

Seven `ExtractedContent` fixtures in `packages/parsers/fixtures/`, generated by `scripts/generate-fixtures.mjs` (`pnpm --filter @xtrakto/parsers generate:fixtures`) from invented data in `scripts/fixture-data.mjs`: `quarterly-basic` (33 movements), `quarterly-year-rollover`, `quarterly-repeated-header` (pages of 14), `quarterly-broken-balance`, `quarterly-large` (465 movements, pages of 50, seeded), `movements-basic` and `movements-overlap`. Every statement reconciles except the broken one, which fails on one row, in total debits and in opening plus movements against closing (checked with a separate script). A test validates each fixture against `extractedContentSchema`.

**Deviations and follow-ups:** The script builds every fixture, not only `quarterly-large`: hand-written balances are easy to get wrong. Appendices A and B updated from real files the human shared (format only, no value copied): pages repeat the header blocks, `FIN ESTADO DE CUENTA` is in column B, `TOTAL CARGOS` is positive, `Referencia` is text, and the export moves interest one day later but never past the range's end. Follow-ups: `INTERES INV VIRT <number>` puts a full account number in the description, which the privacy table forbids storing, so 2.4 or 5.5 must mask it; overlapping movements exports can date the same interest row differently (note added to 10.1).

## 2.4a Quarterly statement header and summary

_2026-10-08_

Phase 2.4 split into 2.4a, 2.4b and 2.4c (estimated at about 990 lines), approved by the human. `readQuarterlyHeader(rows)` in `packages/parsers/src/bancolombia/` reads the client, general and summary blocks: each found by its label, its columns by header name, its values row read as text, with `parseSlashDate` or with `parseAmountText`. Holder name normalized; period checked (start not after end); only `CUENTA DE AHORROS` (`savings`); last 4 digits of the account; `TOTAL CARGOS` kept positive as printed. Failures return `PARSE_FAILED` with reason, block, column and core's cause, never the cell's text. Generic `src/sheets/sheet.utils.ts`: `cellText`, `findLabelRow`, `findColumns`. 34 tests; 100% coverage.

**Deviations and follow-ups:** Decided with the human for all of 2.4: strict failures (a damaged movement or a missing end marker will fail as well), and long digit runs in descriptions masked by the parser with the same length (2.4b, with an ADR). Labels and header names are compared in one function, so Phase 2.7's tolerance for accents and case changes one place for both `canParse` and parsing. Only the columns that are read are required; CUPO SUGERIDO, the address and the city are never read. A number where text is expected counts as a missing value. `debitsMinor` is positive: Phase 2.5 compares it with the negated sum of the debits. The package exports nothing new until 2.4c.

## Outside the phases: Phase size and testing rules

_2026-10-08_

Process changes requested by the human. Phase size (section 1 of the roadmap): only code outside tests counts toward the ~400-line limit. Testing (section 15 of the project rules): always test what is critical (money and dates, parsers and reconciliation, personal data, data isolation and access, deduplication, the numbers users read, usage limits and LLM costs), avoid tests for trivial code, and drop the coverage target.

**Deviations and follow-ups:** Existing tests stay. Phase 2.4a has about 320 lines of code and 300 of tests, within the new limit. Later phases test the rules, edge cases and failures of critical code and skip trivial helpers. The PR checklist (section 17 of the project rules) now asks for tests of new critical logic.

## 2.4b Quarterly statement movements

_2026-10-08_

`readQuarterlyMovements(rows, period)` in `packages/parsers/src/bancolombia/` reads from the first movements header to `FIN ESTADO DE CUENTA`, found in the DESCRIPCIÓN column. Rows are classified in order: the end marker; rows among a page's repeated blocks; blank rows and lone headers; page labels; movements (a `d/mm` date, or a non-text date, which then fails); anything else becomes an `UNEXPECTED_ROW` warning. Dates with `inferDayMonthDate`, amounts and balances with `parseAmountText`, descriptions masked and normalized. `maskLongNumbers` keeps the last 4 digits of every run of 6 or more, at the same length (ADR 0012). Failures carry the row: `missing_end`, `incomplete_page_header`, missing or invalid cells. 34 tests.

**Deviations and follow-ups:** `descriptionRaw` is the cell's text without surrounding spaces and with long numbers masked, which resolves the 2.3 follow-up on `INTERES INV VIRT`; section 4 of the system design and Appendix B note it. A lone movements header is skipped without a warning, like a full repeated page. About 270 lines of code. Still internal: the parser, its output validation and `findParser` arrive in 2.4c.

## 2.4c Quarterly statement parser and registry

_2026-10-08_

`bancolombiaQuarterlyParser` (`bancolombia-savings-quarterly`) in `packages/parsers/src/bancolombia/` joins `readQuarterlyHeader` and `readQuarterlyMovements` and validates the statement with `parsedStatementSchema`: content that isn't a spreadsheet fails with `content_type`, and output outside the schema's bounds with `invalid_output`. `canParse` finds the movements table the same way `parse` does. The package now exports `findParser`, from a default registry with this parser. A shared `fixtures/fixture.utils.ts` loads fixtures in tests. 22 tests: every quarterly fixture parses, a whole statement end to end, the privacy of the output, `canParse` and `findParser`.

**Deviations and follow-ups:** The package exports `findParser` but not the parser itself, which no consumer needs yet. This closes the 2.1 follow-up on a ready-made `findParser`. The movements export still gives `UNKNOWN_FORMAT` until Phase 2.6 registers its parser. About 90 lines of code.

## 2.5 Statement reconciliation

_2026-10-08_

`reconcile(statement)` in `packages/parsers/src/reconciliation/` returns `{ balanceVerified, issues }` with exact integer sums (`sumAmounts`). Checks: each row's balance against the previous printed balance (the opening balance for the first row) plus its amount; the opening balance plus every amount against the closing balance; credits and debits against their printed totals. Issues: `ROW_BALANCE` with its `sourceRow`, `CLOSING_BALANCE`, `TOTAL_CREDITS`, `TOTAL_DEBITS`; a statement without balances returns `NO_BALANCE_DATA`, not an error. Exported with its types. 15 tests: the quarterly fixtures verify, the broken one reports row 20, and each check has its own case.

**Deviations and follow-ups:** Each row is checked against the balance printed on the previous one, so a misprinted amount flags only its row, while a misprinted balance flags its row and the next. A row without a balance leaves the next one unchecked. Issues hold no amounts, so they can be counted in logs and analytics. `debitsMinor` is money out as a positive amount, now documented in core's schema. About 130 lines of code.

## Outside the phases: Phase log in its own file

_2026-10-08_

Requested by the human. The phase log moved from section 7 of the roadmap to this file, one section per entry instead of a table row, with the text unchanged. The roadmap's workflow (section 1, step 5) and the README point here. `CLAUDE.md` gained the reply language, the commands to run, the git handoff at the end of each phase, and how to keep that file short.

**Deviations and follow-ups:** `CLAUDE.md` imports the roadmap, so every session loaded the whole log (about 44 KB, 40% of the roadmap) as instructions; this file isn't imported. As sections, entries no longer make Prettier re-pad a whole table when one cell grows. The roadmap has no section 7 now; its appendices follow section 6.

## 2.6 Bancolombia movements export parser

_2026-10-08_

`bancolombiaMovementsExportParser` (`bancolombia-movements-export`) in `packages/parsers/src/bancolombia/` reads Appendix A.2: the header `Fecha | Descripción | Referencia | Valor` in the first row, its columns found by name; dates from Excel date cells, read as UTC and converted to the day in `America/Bogota`; amounts from numeric cells with `amountFromNumber`; descriptions masked and normalized as in the quarterly statement. `Referencia` stays raw (trimmed) with a `referenceKind` detected by its shape: `phone` (10 digits starting with 3), `atm` (`ATM …`), `code` (anything else: PSE and QR codes, account and contract numbers) or `none` (empty, without a raw reference). Movements come out oldest first: the export is read bottom-up, then sorted by date with a stable sort. The period spans the movements (`periodSource: rows`); there is no account number, holder or balance, so reconciliation returns `NO_BALANCE_DATA`. `findParser` now recognizes both formats, which closes the 2.4c follow-up. 57 new tests: both fixtures, date conversion (05:00 UTC is that day, 00:00 UTC the previous one), order, reference kinds, each failure, and the overlap fixture against July of the quarterly statement (same descriptions and amounts).

**Deviations and follow-ups:** Every row under the header that isn't blank must be a whole movement, with no warnings: an empty date, description or amount fails with `missing_value`, and a cell of the wrong type with `invalid_value` and cause `type`. So a CSV saved from Excel (text dates, decimal commas) fails at its first movement, and so does a numeric reference, which would have lost its leading zeros. An export without movements fails with `no_movements`, since it has no period. `accountType` is `savings`: the export doesn't say, the MVP reads savings accounts, and the user picks the account at upload (5.3). A code that looks like a mobile number counts as `phone`; persistence hashes both kinds the same way. Within a day, the order is the export's reversed, which Appendix A.2 says doesn't match the quarterly statement's; deduplication (10.1) matches movements by content, not position. Both parsers now share `movementDescriptions` (mask, then normalize), `firstSheetRows`, `columnPositions` and `isBlankCell`, and one failure type, `ParseFailure`, with the new reason `no_movements`. `canParse` checks the exact header; Phase 2.7 makes it tolerant through `hasText`, and Phase 2.8 confirms on the real export that the header is in the first row. About 310 lines of code added and 50 removed.
