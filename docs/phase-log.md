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

## Outside the phases: Page title

_2026-10-08_

Requested by the human, in its own commit: the browser tab still showed create-next-app's title. The root layout now has the title (`Xtrakto`) and the description from `docs/brand.md` §8, and `lang="es"`.

**Deviations and follow-ups:** Phase 4.2 still adds the rest of that metadata (`metadataBase`, the title template, `applicationName`, the viewport's theme color) and replaces the Geist fonts with Outfit and Manrope.

## 2.7 Format detection

_2026-10-08_

`hasText` in `packages/parsers/src/sheets/sheet.utils.ts`, the only place where labels, header names and the end marker are compared, now ignores accents, case and extra spaces: both texts are decomposed (NFD), lose their combining marks, collapse their whitespace (non-breaking spaces too) and go uppercase. Both parsers' `canParse` and `parse` go through it, so they accept `DESCRIPCION`, `informacion  cliente:` or `Referencia` with spaces around it alike, and always agree. The default registry's parsers are `DEFAULT_PARSERS`. 22 new tests: each of the seven fixtures is recognized by exactly one parser; a quarterly statement and an export whose labels and headers differ in accents, case and spacing are recognized and read exactly like the originals; a budget, another bank's movements without `Referencia`, the export saved as a one-column CSV, an empty sheet, a workbook without sheets and a PDF are `UNKNOWN_FORMAT`; and the rules of `hasText`.

**Deviations and follow-ups:** Only accents, case and spacing are tolerated. Punctuation still counts (`Movimientos` doesn't match `Movimientos:`, nor `DCTO` match `DCTO.`), and `ñ` counts as `n`. Values aren't labels, so they keep exact comparisons: the account type must still read `CUENTA DE AHORROS`. The export's header must still be its first row, and a quarterly statement needs its movements label and header; anything else is `UNKNOWN_FORMAT`, which the ingestion agent handles in Stage 11. About 30 lines of code.

## 2.8 Private verification with real files

_2026-10-08_

The human copied a real quarterly statement and a real movements export, both `.xlsx` as the bank delivers them, into `packages/parsers/fixtures/private/`, which git ignores. `src/bancolombia/real-exports.private.test.ts` reads every `.xlsx` there as the app will (extract, recognize, parse) and checks that every file is read; that there is a quarterly statement and an export; that each quarterly statement reconciles to the cent, has no unexpected rows and starts with an empty row; and that an export's movements are the quarterly statement's for the same days, with the same normalized descriptions and amounts, interest being the only rows dated differently (one day later, never past the export's last day). All 6 pass on the real files. `fixtures/private-exports.mjs` reads the files in plain JavaScript and returns only their bytes, typed by `private-exports.d.mts`, so the package's TypeScript keeps no Node types and file names, which can carry an account number, never reach a test. `pnpm --filter @xtrakto/parsers test:private` runs them with `vitest.private.config.ts`; `vitest.config.ts` excludes `*.private.test.ts`, so `pnpm test` and CI never do. Stage 2 complete.

**Deviations and follow-ups:** The parsers needed no change: the real files match Appendix A. They confirm what the fixtures assume: the quarterly statement's first row is empty, the export's header is its first row, and the export's last day holds two interest rows while its first day holds none. A one-off check, not committed, also found references of every kind and masked long numbers in both files. Assertions compare only counts, yes/no answers, error codes and row numbers, and reconciliation issues and parse failures carry no amounts or text, so even a failing test prints no content. Only `.xlsx` files are read: a CSV saved from Excel isn't the bank's format (Phase 2.6). Deduplication (10.1) can reuse the test's matching rule: same normalized description and amount, and interest one day later or kept on the export's last day.

## 3.1 Database provider and local PostgreSQL

_2026-10-08_

The human chose Neon at the gate (ADR 0013) and authorized the agent to create the project through Neon's MCP server: `xtrakto` in AWS us-east-1, free plan, PostgreSQL 18.6 (Neon's default) with pgvector 0.8.6 available; the app doesn't use it until preview deployments and Stage 7. `docker-compose.yml` runs `pgvector/pgvector:0.8.6-pg18`, the same versions, with local-only credentials, the port bound to `127.0.0.1`, a named volume and a healthcheck, so `docker compose up --wait` returns once the database accepts connections (about 13 seconds on the first start). `docker/postgres/init.sql` creates the application role `xtrakto_app` (login, no `BYPASSRLS`, no other privileges) and the `xtrakto_test` database. `.env.example` documents `DATABASE_URL` (application role) and `DATABASE_MIGRATION_URL` (owner) with the local values. Verified from the Mac with `pg` 8.23.1, outside the repository: the application role connects to both databases and doesn't bypass Row-Level Security, the owner does, and a wrong password is rejected. README, system design (§9, §12) and roadmap (decision 8) updated.

**Deviations and follow-ups:** The application role and the test database belong to phases 3.4 and 3.2, but are created now because the image runs init scripts only on an empty volume. In PostgreSQL 18 images the data lives in `/var/lib/postgresql/18/docker`, so the volume is mounted on `/var/lib/postgresql`; a mount on `.../data` fails. The healthcheck uses TCP: during the first start the image runs a temporary server on its socket only, so a socket check would pass before `init.sql` ends. Inside the container, connections over `127.0.0.1` are trusted (the image's default); from the host they arrive through Docker's network and need the password. `neondb_owner` has `BYPASSRLS`, and roles created from Neon's console, API or MCP server join `neon_superuser`, which has it too: Phase 3.4 creates `xtrakto_app` with SQL and tests its attributes. The Neon MCP server is installed with access to the whole account, so before production holds real data (7.2) its access to production must be cut. Neon's pooler doesn't keep session-level `SET`, which the transaction-local `set_config` already avoids. Hosted connection strings need `sslmode=verify-full`.

## 3.2 Package scaffold and migration tooling

_2026-10-08_

`@xtrakto/db` with drizzle-orm 0.45.3, drizzle-kit 0.31.11 and pg 8.23.1, pinned exactly, and `types: ["node"]` as planned in 0.3. `createDb({ connectionString, maxConnections? })` opens a node-postgres pool and wraps it with Drizzle's `node-postgres` driver (ADR 0013). It listens for the pool's `error` event, which node-postgres emits when an idle connection dies (Neon suspending an idle database, Docker restarting) and which would otherwise crash Node; the next query opens a new connection. `drizzle.config.ts` reads tables from `src/**/*.schemas.ts`, writes migrations to `migrations/` and connects, as the owner, only when `DATABASE_MIGRATION_URL` is set; the root has `db:generate`, `db:migrate` and `db:studio`. drizzle-kit and Vitest load the root `.env.local` with `process.loadEnvFile`; variables already set win. `test/test-database.ts` reads `TEST_DATABASE_URL` (application role) and `TEST_DATABASE_MIGRATION_URL` (owner): with neither the database tests are skipped, with only one it throws, and in CI without both it throws. It refuses a host that isn't local or a database whose name doesn't end in `_test`, naming the host and database but never the URL. `test/global-setup.ts` fails once, saying what to do, when the database is configured but down. `packages/db/turbo.json` runs `test` without cache, since results depend on the database, and passes both variables through Turborepo's strict mode. CI starts the database with `docker compose up --wait` and sets both variables. 11 tests: the configuration guards, the application role (not a superuser, no `BYPASSRLS`), and a pool that keeps working after the server ends its idle connection.

**Deviations and follow-ups:** drizzle-orm is 0.45.3, not the planned 0.45.4: 0.45.4 came out the same day, so pnpm's minimum release age blocked it and added an exclusion to `pnpm-workspace.yaml` on its own (removed); 0.45.3 is the release drizzle-kit 0.31.11 shipped with. drizzle-kit brings three esbuild versions with install scripts, so `allowBuilds` gets `esbuild: false`: the binaries come from the `@esbuild/<platform>` packages. The roadmap said the integration tests are skipped when the database isn't available; now that means not configured, and CI always runs them (the roadmap's 3.2 text says so). The project rules gained the `.queries.ts` suffix, only in `packages/db`, for functions that read or write the database, with its Drizzle tables in `.schemas.ts` (own commit, approved by the human). `pnpm db:generate` fails with "No schema files found" until Phase 3.3 adds tables; with an empty schema file it reports 0 tables (checked, not committed). Checked by hand: the tests are skipped without the variables, fail with the setup message when the database is stopped, and fail when `createDb`'s listener is removed. Next.js reads `.env*` only from `apps/web`: Phase 4.1 decides how the app gets the root `.env.local`. About 200 lines of code.

## 3.3 Schema v1

_2026-10-08_

Five tables in `packages/db/src/<module>/<name>.schemas.ts`: `users`, `accounts`, `statements`, `transactions` and `ingestion_jobs`, with explicit snake_case names, uuid keys, `bigint` amounts read as numbers and branded `AmountMinor`, `date` columns read as `LocalDate` strings and `timestamptz` instants. `migrations/0000_schema-v1.sql` is generated by drizzle-kit. Composite foreign keys carry `user_id`, because foreign keys skip Row-Level Security: statements reference `(account_id, user_id)` and movements `(statement_id, account_id, user_id)`, so a row can't land on another user's account or on another account's statement. Everything cascades from `users`. CHECK constraints come from core's constants (account type, currency, reference kind, category source and kind) and cover a four-digit `last4`, SHA-256 hex fingerprints and hashes, category and reference pairs, non-negative order columns, amounts within JavaScript's safe integers and finished ingestion jobs without content. `CATEGORY_SOURCE` added to core; `INGESTION_JOB_STATUS` lives in db. The test setup now drops and rebuilds the `_test` database from the migrations on every run (only if its name ends in `_test`), so every run proves they apply to an empty database; `pnpm db:migrate` applied them to the development database too. 18 new tests: foreign keys reject another user's account and another account's statement, uniques reject a repeated statement or fingerprint while twins with their own pass, each CHECK rejects its case, extreme amounts and leap days read back exactly, a user's rows go with the user, and `isOneOf` refuses values that aren't plain words.

**Deviations and follow-ups:** Additions to the roadmap's columns, all agreed in the plan: `statements.content_hash`, unique per account, so saving the same statement twice inserts nothing and a corrected statement for the same period isn't merged into the original; `transactions.position` (the bank's order within a day) and `occurrence_index` (part of the fingerprint, kept so fingerprints can be recomputed); totals as columns; `display_name` nullable. `accounts` keeps NULLs distinct in its unique key, so two accounts without `last4` are allowed; Phase 5.5 must reuse an export's account when a quarterly statement for it arrives. drizzle-kit drops bound parameters from CHECK constraints, so `isOneOf` writes values into the SQL and accepts only plain words. `migrations/meta/` is in `.prettierignore`: Prettier would rewrite drizzle-kit's JSON. No `db:push`: it would drop the policies of Phase 3.4. About 260 lines of code.

## 3.4 Row-Level Security and user context

_2026-10-08_

`migrations/0001_row-level-security.sql`, hand-written with `drizzle-kit generate --custom`, creates `xtrakto_app` without login if it's missing, grants it `SELECT` and `INSERT` on `users` and read and write on the other four tables, enables and forces Row-Level Security on those four, and gives each one policy for `xtrakto_app`: `user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid)`, for reads and writes alike (ADR 0014). `withUserContext(db, userId, fn)` takes a branded `UserId` and checks it's a UUID, checks once per database object that the connection's role doesn't bypass Row-Level Security, sets `app.user_id` with `set_config(…, true)` and runs `fn` with `{ tx, userId }`. `isUserId` and `toUserId` turn ids read from `users` into `UserId`. 15 new tests, as the application role: each user sees only their rows in the four tables without a filter; without a user nothing is visible and inserts fail; a pooled connection that served a user reads the leftover setting as no user, without errors; rows written for another user, or handed over to one, fail; another user's rows can't be changed or deleted; a movement can't be attached to another user's statement, so the other user's fingerprint still saves; two users at once stay apart; a throw rolls back; a Clerk id is rejected; an owner's connection is refused; and `users` can be read and added to but not changed, deleted or truncated. A catalog test checks every table but `users` for forced Row-Level Security, a `user_id uuid not null` and exactly one policy; that `xtrakto_app` has no privileged attribute, membership or ownership, can't create in `public` or see the migrations schema, and holds exactly the planned table privileges; and that there's no `SECURITY DEFINER` function. Checked by hand: removing `nullif` or the role check fails the tests. On a temporary Neon branch, both migrations applied as `neondb_owner` and `xtrakto_app` came out without `BYPASSRLS` or memberships; with a temporary grant, the owner saw 2 accounts and `xtrakto_app` none without a user and only user A's with A set.

**Deviations and follow-ups:** None from the plan. PostgreSQL 16 and later give the creator of a role an admin membership on it: on Neon, `neondb_owner` can set `xtrakto_app`'s password but can't act as it (no `SET`, no `INHERIT`); the catalog test only checks the memberships of `xtrakto_app` itself. In production (7.2) the human runs `ALTER ROLE xtrakto_app LOGIN PASSWORD …` with at least 60 bits of entropy; preview branches copy it from their parent. The daily cleanup of ingestion content (5.5) works across users and needs a `SECURITY DEFINER` function owned by the owner, explicitly allowed in the catalog test. Account deletion (4.5) adds `DELETE` on `users` with its own policy. Inside `withUserContext`, no network calls, since it holds a pooled connection, and no `Promise.all` on `tx`: a transaction is one connection, and node-postgres warns that queueing queries on a busy client will fail in pg 9 (the first version of the tests did it). About 150 lines of code, 60 of them SQL.

## 3.5 Persistence functions and dev seed

_2026-10-08_

Core: `prepareStatement(parsed, identifierHashKey)` readies a parsed statement for saving. Each movement gets fingerprint v1, its occurrence index among identical movements, its position and the HMAC of its reference (none for kind `none`), and loses its raw reference and source row; the statement gets a content hash. Fingerprint v1 is the SHA-256 of `xtrakto.tx.v1:` and the JSON of date, NFC-normalized description, amount and balance after (or null), then the occurrence index. The content hash covers the format, period, balances, totals and every fingerprint, in order. SHA-256 and HMAC share `hashing/web-crypto.utils.ts`. db: `findOrCreateUser` (insert, then read, so concurrent first requests get one id); `findOrCreateAccount` by bank, type and last4; `saveStatement` checks the account is the user's (else `NOT_FOUND`, before any write), refuses a repeated fingerprint, inserts the statement or finds it by content hash (then nothing else is inserted), and inserts movements in chunks of 1,000, skipping fingerprints the account already has; `listTransactions` filters by user, account and inclusive period, orders by date, position and id, newest first, and pages with `hasMore`. `pnpm db:seed` (`apps/web/scripts/seed.mts`, run with tsx) parses, reconciles, prepares and saves `quarterly-basic`, `quarterly-year-rollover` and `movements-basic` as the application role for `SEED_CLERK_USER_ID`, on local databases only: 57 movements in one account and three statements the first time, nothing the second. 27 new tests: 14 in core (a fingerprint vector computed outside the code; what changes it and what doesn't; NFC; a description that mimics other fields; occurrence indexes; references hashed and dropped; content hashes) and 13 in db (HMAC stored, never the raw reference; the same statement twice; twin transfers; overlapping exports stored once; 2,500 movements across inserts; a failure in the last insert saving nothing; a repeated fingerprint; another user's account; listing, filters, bank order and pages; concurrent `findOrCreateUser`). Stage 3 complete.

**Deviations and follow-ups:** `prepareStatement` lives in core and does what Phase 5.5 calls preparing rows: the seed had to go through the same functions. The seed lives in `apps/web`, since only apps may combine parsers and db, and reads the fixtures with `fs`, so the parsers' API didn't change; it's `.mts` because apps/web isn't an ES module package. `PreparedStatement` keeps the parser's warnings (codes and row numbers only). The seed was checked with a throwaway hash key passed on the command line: setting a real `IDENTIFIER_HASH_KEY` later leaves those seeded hashes as they are, so reset with `docker compose down -v` before reseeding if they matter. The movements export goes into the quarterly statements' account; Phase 5.5 must do the same when a quarterly statement arrives for an account created from an export. Fingerprint v1 leaves references out: two identical same-day transfers to different phones can swap their reference hashes across overlapping exports, while counts and amounts stay right. `listTransactions` returns whole rows; the transactions page (5.7) may select fewer columns. About 330 lines of code.

## 4.1 Environment validation

_2026-10-08_

`apps/web/src/lib/env.ts` (`server-only`) validates the server's variables with Zod: `DATABASE_URL` must be a `postgres` or `postgresql` URL, and a host that isn't local needs `sslmode=verify-full`; `IDENTIFIER_HASH_KEY` needs at least `MIN_IDENTIFIER_HASH_KEY_LENGTH` (32) characters. `parseServerEnv` keeps only those variables and throws an error that names each invalid one and why, never its value. `getServerEnv` parses `process.env` on first use, so `next build` and the tests don't need the variables. `src/instrumentation.ts` calls it when a server starts: in Next 16.3 a throw in `register()` ends `next dev` and `next start` (checked in Next's source), and `register()` doesn't run during `next build`. `next.config.ts` loads the root `.env.local`, since Next reads `.env*` only from `apps/web`; variables already set win. The app gains `zod` 4.6.5 (core's version) and `server-only` 0.0.1, and the build task hashes the root env files (`$TURBO_ROOT$/.env*`). 11 tests: valid URLs (local, IPv6, hosted with `verify-full`); every missing variable named at once; the empty key that `.env.example` ships with; a short key and four bad URLs rejected without their values in the message. Two mutations (no `verify-full` check, the value in the message) each fail tests. Checked by hand: with the empty key, `next dev` stops at startup naming `IDENTIFIER_HASH_KEY`; with a valid one, `/` answers 200.

**Deviations and follow-ups:** No client schema. The only public variable on the way, Clerk's publishable key (4.4), is read by Clerk, and the server schema validates it at startup; a client schema comes when the app's own browser code reads a public variable. One `.env.local` at the root rather than one per app, against Turborepo's recommendation, to keep a single copy of the database URL and the hash key. `next.config.ts` validates nothing, because `next typegen` evaluates it in CI without variables; it uses `__dirname` because Next compiles it to CommonJS (only `--experimental-next-config-strip-types` loads it natively). The `verify-full` check runs `URL.canParse` first: Node's `URL` error keeps the input, password included. `NEXT_RUNTIME` is read directly in `instrumentation.ts`, the documented pattern: Next sets it per bundle at compile time, which keeps `env.ts` out of the Edge bundle. `passWithNoTests` removed (0.5 follow-up). Turborepo's strict mode doesn't pass shell-exported variables to `pnpm dev`, so the valid-key check ran `next dev` through `pnpm --filter web exec`; noted in `CLAUDE.md` and the README. Until the human sets `IDENTIFIER_HASH_KEY` in `.env.local`, `pnpm dev` stops at startup, as intended. About 70 lines of code.

## 4.2 UI base: shadcn/ui and root layout

_2026-10-08_

shadcn/ui initialized in `apps/web` with CLI 4.21.4 on Base UI and the `nova` preset (ADR 0015): `components.json`, the neutral component variables in `globals.css` in light mode only, and `@base-ui/react`, `class-variance-authority`, `cn` and `lucide-react` pinned as dependencies, with `shadcn` (for `shadcn/tailwind.css`) and `tw-animate-css` as development dependencies, since only the CSS build reads them. The root layout loads Outfit (300–600) and Manrope (400–700) with `next/font/google` as `--font-outfit` and `--font-manrope`, replacing Geist; `font-sans` and `font-heading` are Manrope and `font-display` is Outfit. Metadata from `docs/brand.md` §8: `metadataBase`, the title template, the description, `applicationName`, and the viewport's theme color; `manifest.ts` as written there. `components/brand/Logo.tsx` gives `LogoMark` (detailed from 40px, simple below, unique ids per instance) and `Logo` (mark and live wordmark, Outfit 500 at `0.3em`), and the placeholder page uses it, which closes the brand kit's follow-up on the `0.34em` tracking. Checked: the page shows the detailed mark, the wordmark in Outfit and the tagline in Manrope (headless Chrome screenshot); the HTML has `lang="es"`, the theme color, the manifest, the three icons and the social image with its alt text; `pnpm --filter web build` passes and points the social image at `https://xtrakto.site`.

**Deviations and follow-ups:** The CLI wrote dependency ranges (`^`); pinned like the rest of the repository. It wrote `--font-sans: var(--font-sans)`, which expects `next/font` to use that name; the fonts now come from the brand variables. Its `src/lib/utils.ts` was removed: the CLI's components import `cn` from the `cn` package, `components.json` points the `utils` alias at it, and a dry run of `button` and `alert-dialog` confirmed the imports. The `.dark` block and the unused sidebar and chart variables were removed; `@custom-variant dark` stays so that `dark:` classes don't follow the system setting. `components/ui/` keeps the CLI's kebab-case file names (project rules §5, own commit). The brand (fonts, `--color-ink`, the logo) arrived in this phase, as it is decided in `docs/brand.md`; the component tokens stay neutral until 4.3. The Chrome extension wasn't connected, so the visual check used headless Chrome. About 200 lines of code.

## 4.3a Design direction, tokens and base components

_2026-10-08_

Gate closed with the human: the design is v7 (the layout of v4 with the style of v6), as `.claude/rules/design-system.md` already described, and the human added its screenshots in `docs/ui/` (summary page at desktop and phone widths, details at 2x, an annotated map of the components). Phase 4.3 split in two (about 650 changed lines), approved by the human: this part has the tokens and the base components, and 4.3b the development page. `globals.css` holds the §13 tokens in `@theme static`, so every one is a CSS variable even when no class uses it (inline styles, charts and Clerk's appearance in 4.4 read them): surfaces, text, primary, the three kinds, `--color-danger`, a type scale (`text-title`, `text-amount-xl`/`l`/`m`, `text-section`, `text-body`, `text-caption`, `text-meta`, each with its line height), `max-w-page` (1360px), the fixed v7 radii and the shadows. shadcn's semantic colors point at those tokens in `@theme inline`, so the CLI's components follow the design without rewriting each class. The base layer draws the background gradient, a 3px primary focus ring with 3px of offset on every focusable element, and stops animations under `prefers-reduced-motion`. `button`, `card` and `badge`, added with the CLI and rewritten for v7: `Button` (primary pill of 50px with its blue shadow, secondary, destructive, link action with a 44px target, `sm` of 44px) and `IconButton` (a 44px circle whose `label` is required, so it always has an `aria-label`); `Card` with three surfaces, `tile` (stat cards and insight tiles), `card` (large blocks) and `panel` (translucent, for the account and the chat), without shadcn's border; `Badge` with `neutral`, one variant per kind and `attention`. `design-system.md` gains `--danger` (§3.5), its contrast pairs (§3.6) and §13 in sync with `globals.css`. Checked: the WCAG contrast of 18 text pairs computed from `globals.css` (12 from §3.6 plus the ones the components use), all at least 4.5:1, the lowest `ink-muted` on the background at 4.83:1, and `danger` 6.47:1 on white; the production build passes.

**Deviations and follow-ups:** The KPI tile moves to 6.7, with its first consumer (decided with the human). No `docs/design.md`: the rules file stays the only documentation of the tokens, and `docs/ui/README.md` now points to it (the images still say `design.md`, whose sections are the same). The type scale and `max-w-page` go beyond §13's original block, as the roadmap asks for typography tokens; spacing needs none, since Tailwind steps by 4px. `--danger` comes from the human's decision in the Stage 4 plan: the orange and the green mean kinds and can't mark errors. ADR 0015's example of a button that navigates was missing `nativeButton={false}`, which Base UI asks for when it renders something other than a `<button>`. For 4.6: `docs/ui/README.md` says the header uses the mark at 40px on desktop and 32px on phones, while `docs/brand.md` §8 says 32px and 28px; decide there. The phone tab bar has five items (Resumen, Movimientos, Subir, Pregúntale, Más). About 345 lines of code, 220 of them the three components, which began as the CLI's output.

## 4.3b Design system development page

_2026-10-09_

`/design-system`, a development-only page in the `(dev)` route group, shows the v7 tokens and the base components to compare with `docs/ui/`: color tokens by group, the text pairs of §3.6 plus danger, the type scale, radii and shadows, the logo at three sizes (white on ink too), every button variant and `IconButton`, the three card surfaces (a stat tile with its icon chip, a large card, the account panel) and the badges. Outside `next dev` it answers `notFound()` through `isDevelopment` in `env.ts`, which reads `NODE_ENV` (Next.js inlines it per command); the production build serves it as a 404 with the generic title and none of its content. Its parts live in `src/features/design-system/`: the token lists in `design-system.constants.ts` (names only; the page paints each token through its CSS variable, so values live only in `globals.css`), `TokenGallery`, `ComponentGallery` and `GallerySection`. Checked in headless Chrome, emulating a 1440px desktop and a 400px phone through the DevTools protocol: no sideways scrolling at either width, and the page matches the screenshots' surfaces, pills, shadows and type.

**Deviations and follow-ups:** The check found a bug from Phase 4.2: `<html>` had `h-full`, and the page background, painted at the root's size, repeated its gradient once per screen, with a visible seam every 900px. `<html>` now grows with the page and `<body>` has `min-h-dvh`, so the gradient spans the whole page. Headless Chrome's `--window-size` can't go below about 500px, so phone checks emulate the viewport through the DevTools protocol instead. About 400 lines of code, most of them the galleries' markup and the token lists.

## 4.4 Authentication with Clerk

_2026-10-09_

The human created the Clerk application (development instance; email and password, and Google; no phone) and added its keys to the root `.env.local`, from the dashboard, since the Clerk MCP server needed a new sign-in. `@clerk/nextjs` 7.9.12 (Core 3; 7.9.13 was under pnpm's one-day minimum release age) and `@clerk/localizations` 4.22.1, pinned. `src/proxy.ts` runs `clerkMiddleware` with Clerk's matcher and the sign-in and sign-up paths as options, and redirects a signed-out visitor early outside `isPublicPath` (`/sign-in`, `/sign-up` and their subpaths, in `lib/auth-routes.ts`). Every protected page calls `requireSignedIn()` (`lib/auth.ts`, on `auth.protect()`): the placeholder home and the design page. `ClerkProvider` sits inside `<body>` with the Spanish localization, the routes, and an appearance built on the v7 tokens (`lib/clerk.ts`): CSS variables for colors and radius, Clerk's styles in a `clerk` layer declared before Tailwind's utilities, a pill primary button with its blue shadow, the card with the panel shadow, and Clerk's logo box hidden, since `(auth)/layout.tsx` shows the stacked logo above the card. `env.ts` validates both keys by their prefix. 14 new tests, 25 in the app: `isPublicPath` on 12 paths, the secret key pasted in the public variable (it would ship to every browser) and a key without its prefix, neither printed. Checked: anonymous `/` and `/design-system` answer 307 to `/sign-in` with `redirect_url`; `/sign-in`, `/sign-up`, the manifest and the icons answer 200; both screens render in Spanish with the v7 style at desktop width and at 390px (Chrome DevTools), and the console shows only Clerk's development-keys warning; `next build` passes. The human signed up, reached `/`, signed out to `/sign-in` and signed in again.

**Deviations and follow-ups:** Clerk Core 3 deprecated `createRouteMatcher` and says the middleware is not where routes are protected, because server actions are called by id, not by path. So the proxy only redirects early, and each page, layout, action and route handler checks the session itself; `ARCHITECTURE.md` §2, the roadmap's 4.4 text and `CLAUDE.md` say so (`CLAUDE.md` in its own commit). `@clerk/eslint-plugin` could enforce it, but its rule is experimental (0.2.0); not adopted. The sign-in routes are constants passed to the middleware and to the provider, not `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: Clerk's middleware forwards them to `auth()` in pages (checked in its source). Clerk has no Colombian Spanish: es-ES leaves the fewest strings in English (828, against 916 in es-MX) but mixes "tú" and "usted", so `lib/clerk.ts` rewrites the texts of the screens shown, and fills the email format hint that es-ES leaves in English, which screen readers read. Clerk accepts `var(--color-…)` values (checked in the browser), so the colors have one source and `@clerk/ui`'s shadcn theme wasn't needed. Clerk's dashboard prompt suggests `clerk init`, which rewrites the provider, the middleware and the environment setup; not used, but its matcher form `'/__clerk/:path*'` was adopted. Keyless mode can't start, since the server stops without the keys. The agent doesn't create Clerk accounts or sign in, so the human tested the flow. For 4.6: the `UserButton` moves from the placeholder to the header. `SEED_CLERK_USER_ID` can now take the human's user id, so the seeded data shows up in their account (5.7). About 220 lines of code.

## 4.5 User lifecycle and data deletion

_2026-10-09_

`migrations/0002_account-deletion.sql`, hand-written with `drizzle-kit generate --custom`, grants `DELETE` on `users` to `xtrakto_app` and forces Row-Level Security on `users` with three policies: anyone may be read and added, as before, and only the current user's row deleted (ADR 0016, which supersedes ADR 0014's grants on `users`). `findUserId` finds a Clerk user without creating the row; `deleteAllUserData(ctx)` deletes the context's user, and the foreign keys' cascades take their accounts, statements, movements and ingestion jobs. In the app: `lib/db.ts` (`getDb`, one pool per instance, opened on first use); `getSignedInClerkUserId` for actions; `features/users/user.service.ts` with `deleteUserData` (repeatable, for the webhook) and `deleteAccountAndData` (the data first, then the Clerk user, so a Clerk failure leaves no data behind and a retry is safe); the `deleteAccount` action, whose only input is the session; `/settings` with a section and a confirmation dialog (shadcn's `alert-dialog` on Base UI, adapted to v7: panel radius, pop shadow, no borders); and `POST /api/webhooks/clerk`, public in the proxy, which verifies Clerk's signature before reading anything, deletes the data of a `user.deleted` user, and answers 400 to a bad signature and 503 while no secret is configured. `CLERK_WEBHOOK_SIGNING_SECRET` is optional in development and required in production. 6 new tests in db (every row of the user gone from the five tables and another user's intact; nothing deleted without a context or across users; a second call does nothing; `findUserId` finds without creating), and the catalog and user-context tests updated; 23 new in the app, 48 in all: the service's order and failures, the action's session check, the webhook with real signatures from `node:crypto` against Clerk's verifier (unsigned, signed for another body, signed with another secret), the hook, the environment and the public routes. Loosening the delete policy fails three db tests, and skipping the signature check fails the three rejection tests. Checked: anonymous `/settings` answers 307 to `/sign-in`; an unsigned webhook answers 503 and deletes nothing; with a throwaway account of the human's seeded (3 statements, 57 movements), deleting it from `/settings` left 0 rows for it and the other user's 57 movements untouched, removed the Clerk user and signed out to `/sign-in`.

**Deviations and follow-ups:** `getCurrentUserId()` moves to 5.4, its first consumer: deletion goes by Clerk id and must not create the row (roadmap updated). Deleting the Clerk user also makes Clerk send `user.deleted`, whose second deletion finds nothing. A bug found in the browser: after the data was deleted, the dialog hung on "Eliminando…". The hook awaited Clerk's `signOut` inside `startTransition`; Clerk navigates inside its own transition and resolves only once it commits, which React holds while another async transition is pending. The hook now keeps its own pending state and calls `signOut` outside any transition; a test reproduces the hang with real React on happy-dom (20.14.5, a development dependency) and Clerk's navigation mechanism, and fails on the old code. Until the shell (4.6) puts it in the user menu, the placeholder home links to `/settings`. The webhook endpoint and its secret are registered in Clerk in 7.2; until then, users deleted from Clerk's dashboard keep their local data. Deleting an account is sensitive: Clerk's reverification (asking for the password again before such actions) is a candidate before the public launch. The agent doesn't sign in to Clerk, so the human ran the end-to-end deletion with throwaway accounts; `SEED_CLERK_USER_ID` should now point to the human's main account. About 330 lines of code, plus the 110 of the CLI's alert dialog.
