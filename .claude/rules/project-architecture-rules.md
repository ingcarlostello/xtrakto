# Architecture and development rules — Xtrakto

Mandatory standards for all code in the monorepo. They apply equally to people and to AI agents (Claude Code, Cursor).

**How to read this:**

- **Always / Never** = mandatory. A PR that breaks one is not merged.
- **Prefer / Avoid** = recommended. Can be broken with an explicit reason in the PR.

If a rule conflicts with code clarity in a specific case, clarity wins. The exception must be justified.

---

## Contents

1. [Stack and monorepo structure](#1-stack-and-monorepo-structure)
2. [Principles: Clean Code and SOLID](#2-principles-clean-code-and-solid)
3. [Server Components, Client Components and hooks](#3-server-components-client-components-and-hooks)
4. [Organization of `apps/web`](#4-organization-of-appsweb)
5. [Naming conventions](#5-naming-conventions)
6. [Types, schemas and validation](#6-types-schemas-and-validation)
7. [Services, actions and data access](#7-services-actions-and-data-access)
8. [Utils and helpers](#8-utils-and-helpers)
9. [Constants and environment variables](#9-constants-and-environment-variables)
10. [Client state](#10-client-state)
11. [Money and dates](#11-money-and-dates)
12. [Error handling](#12-error-handling)
13. [Privacy and security](#13-privacy-and-security)
14. [LLMs and agents](#14-llms-and-agents)
15. [Testing](#15-testing)
16. [Git and commits](#16-git-and-commits)
17. [Checklist before opening a PR](#17-checklist-before-opening-a-pr)

---

## 1. Stack and monorepo structure

**Stack:** pnpm workspaces and Turborepo · Next.js (App Router) · strict TypeScript · Tailwind and shadcn/ui · PostgreSQL with Drizzle · Zod · Clerk · Inngest · Vercel AI SDK · Vitest · date-fns.

```text
xtrakto/
├── apps/
│   └── web/                 Next.js: routes, UI, server actions, Inngest functions
├── packages/
│   ├── parsers/             Per-bank statement reading + ingestion agent
│   ├── core/                Domain types, Zod schemas, money, dates, PII redaction
│   ├── db/                  Drizzle schema, migrations and queries
│   ├── evals/               Anonymized fixtures and evaluation suites
│   ├── typescript-config/   Shared TS configuration
│   └── eslint-config/       Shared ESLint configuration
├── ml/                      Python: training and ONNX export (outside the pnpm workspace)
└── docs/                    ADRs, data flow and architecture
```

### Dependency rules

- **Always** respect the direction: `apps → packages`. Within `packages`: `parsers → core`, `db → core`, `core → (nothing internal)`.
- **Never** import from `apps/*` inside a package.
- **Never** create circular dependencies between packages.
- **Always** import a package by its public name (`@xtrakto/parsers`), never by internal path (`@xtrakto/parsers/src/bancolombia/...`). Each package exposes its API in `src/index.ts`.
- **Never** add React, Next.js or database access to `packages/parsers` or `packages/core`. They must be pure TypeScript, testable without spinning anything up.
- A new package is created only when there is real code to share. No empty packages "just in case".

---

## 2. Principles: Clean Code and SOLID

### Clean Code

- **Names that reveal intent.** `isBalanceReconciled`, not `chk`. Booleans start with `is`, `has`, `can` or `should`.
- **Short functions with a single responsibility.** If describing what it does needs an "and", split it.
- **At most 3 parameters.** With more, take a typed object.
- **Early returns** instead of nested `if`s.
- **DRY with judgment.** Extract on the third repetition, not the second. A wrong abstraction costs more than a little duplication.
- **Comments explain why**, not what. If the code needs a comment to understand what it does, rename or split it.
- **Never** leave commented-out code, debugging `console.log` or a `TODO` without a linked issue.

### SOLID applied to this project

| Principle | How it applies here                                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SRP**   | A component renders, a hook manages UI state, a service talks to the outside world, a parser reads one format.                                                   |
| **OCP**   | Adding a new bank = adding a new parser that implements `BankParser`. The ingestion agent is not modified.                                                       |
| **LSP**   | Any `BankParser` must be substitutable for another: same signature, same output contract (`ParsedStatement`), same guarantees.                                   |
| **ISP**   | Components receive only the props they use. Pass `amount` and `date`, not the whole `Transaction` object, if that's all you need.                                |
| **DIP**   | Code depends on interfaces (`BankParser`, `VectorStore`, `LlmClient`), not concrete implementations. The LLM provider can be swapped without touching the logic. |

```typescript
// packages/parsers/src/registry/bank-parser.types.ts
export type BankParser = {
  id: string; // "bancolombia-savings-quarterly"
  bankId: string; // "bancolombia"
  canParse: (content: ExtractedContent) => boolean;
  parse: (content: ExtractedContent) => Result<ParsedStatement>;
};
```

---

## 3. Server Components, Client Components and hooks

In the App Router the **server is the default place** to fetch data. Fetching data with `useEffect` on the client is the exception, not the rule.

- **Always** write Server Components by default. Add `"use client"` only if the component needs interactivity, state, effects or browser APIs.
- **Always** push `"use client"` as far down the tree as possible: the page is a server component and only the interactive button or filter is a client component.
- **Always** fetch initial data in Server Components by calling server services.
- **Never** use `useEffect` to load the app's own initial data.
- **Always** encapsulate non-trivial client logic in custom hooks (`use-*.ts`): compound UI state, forms, subscriptions, timers.
- **Never** pass a Client Component data it won't display. Everything that crosses that boundary reaches the browser.

```tsx
// ❌ Wrong: initial data with useEffect on the client
"use client";
export function StatementSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  useEffect(() => {
    fetch("/api/summary")
      .then((r) => r.json())
      .then(setSummary);
  }, []);
  return <SummaryCards summary={summary} />;
}

// ✅ Right: the page (server) fetches the data; the client only handles interaction
// app/(dashboard)/summary/page.tsx
export default async function SummaryPage() {
  const summary = await getStatementSummary(); // statement.service.ts (server-only)
  return (
    <>
      <SummaryCards summary={summary} /> {/* Server Component */}
      <PeriodFilter /> {/* Client Component with usePeriodFilter() */}
    </>
  );
}
```

---

## 4. Organization of `apps/web`

**Feature-based** organization. The `app/` folder contains only routes; logic lives in `features/`.

```text
apps/web/src/
├── app/                                 Routes only: page, layout, loading, error, route handlers
│   ├── (dashboard)/summary/page.tsx
│   └── api/inngest/route.ts
├── features/
│   └── statements/
│       ├── components/
│       │   ├── StatementSummary.tsx
│       │   └── PeriodFilter.tsx
│       ├── hooks/
│       │   └── use-period-filter.ts
│       ├── actions/
│       │   └── upload-statement.action.ts     "use server"
│       ├── statement.service.ts               server-only
│       ├── statement.schemas.ts
│       ├── statement.types.ts
│       └── statement.constants.ts
├── components/
│   └── ui/                              shadcn/ui components
├── lib/                                 Configured clients: db, ai, auth, logger
└── utils/                               Generic pure functions
```

- **Always** put a feature's code inside its folder in `features/`. If two or more features use it, move it up to `components/`, `utils/` or a package.
- **Never** put business logic inside `app/`. A `page.tsx` composes, it doesn't compute.
- **Avoid** barrel files (`index.ts` that re-export everything) inside `apps/web`. They cause circular imports and hurt tree-shaking. Barrels exist only at the root of each package.
- **Always** use the `@/` alias instead of relative paths deeper than one level (`../../`).

---

## 5. Naming conventions

| Element                          | Convention                                  | Example                                    |
| -------------------------------- | ------------------------------------------- | ------------------------------------------ |
| React components (file and name) | `PascalCase.tsx`                            | `StatementSummary.tsx`                     |
| Hooks                            | `use-kebab-case.ts`, exports `useCamelCase` | `use-period-filter.ts` → `usePeriodFilter` |
| Other files                      | `kebab-case.<role>.ts`                      | `statement.service.ts`, `money.utils.ts`   |
| Tests                            | next to the file, `*.test.ts`               | `normalize.test.ts`                        |
| Variables and functions          | `camelCase`                                 | `parseStatement`                           |
| Types                            | `PascalCase`                                | `ParsedStatement`                          |
| Constants                        | `UPPER_SNAKE_CASE`                          | `MAX_FILE_SIZE_BYTES`                      |
| Internal packages                | `@xtrakto/<name>`                           | `@xtrakto/parsers`                         |

**Allowed role suffixes:** `.types.ts`, `.schemas.ts`, `.service.ts`, `.action.ts`, `.utils.ts`, `.helpers.ts`, `.constants.ts`, `.store.ts`. In `packages/db` only, also `.queries.ts` for the functions that read or write the database (section 7); its Drizzle tables go in `.schemas.ts`.

**Inside packages:** group source files by domain module, one folder per concept: `src/<module>/<name>.<role>.ts` (for example `packages/core/src/money/money.helpers.ts`). File names keep their role suffix, tests stay next to the file they test, and folders have no barrel: modules import each other with relative paths, and only `src/index.ts` is public.

**Language:** code, identifiers and comments in English. User-facing text is in Spanish and centralized to ease future translation.

---

## 6. Types, schemas and validation

- **Always** use TypeScript in `strict` mode.
- **Never** use `any`. Use `unknown` and narrow the type. `as` is allowed only with a comment justifying why it's safe.
- **A single source of truth per type.** Don't hand-duplicate what already exists:
  - Data crossing a boundary (forms, API, LLM output) → Zod schema and `z.infer`.
  - Database rows → types inferred from Drizzle (`typeof transactions.$inferSelect`).
- **Always** validate with Zod at every trust boundary: server action and route handler input, uploaded files, external API responses and LLM output.
- **Prefer** `type` over `interface`, unless you need declaration merging.
- **Never** use `enum`. Use an `as const` object and derive the union type.

```typescript
// statement.schemas.ts
export const statementKindSchema = z.enum(["savings", "credit_card"]);
export const uploadStatementSchema = z.object({
  kind: statementKindSchema,
  fileName: z.string().min(1).max(200),
});

// statement.types.ts
export type StatementKind = z.infer<typeof statementKindSchema>;
export type UploadStatementInput = z.infer<typeof uploadStatementSchema>;
```

- Domain types shared across packages live in `packages/core`. Types for a single feature live in its `<feature>.types.ts`. A one- or two-line type used in only one file can stay in that file.

---

## 7. Services, actions and data access

| Piece                         | Responsibility                                                                                                                                                                                                                    | Where it runs |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `*.service.ts`                | A feature's server logic: query the database, call the LLM, R2 or Clerk                                                                                                                                                           | Server only   |
| `*.action.ts`                 | Server action: validates input with Zod, checks the session, calls the service, returns a result                                                                                                                                  | Server only   |
| `app/api/**/route.ts`         | Only for webhooks and endpoints called by third parties (Inngest, Clerk)                                                                                                                                                          | Server only   |
| `packages/db`                 | Drizzle schema (`*.schemas.ts`) and migrations                                                                                                                                                                                    | Server only   |
| `packages/db/**/*.queries.ts` | Database access: connection, user context, reads and writes. Receives the user id from a service or action that already checked the session. Never imports `server-only`, because it also runs in drizzle-kit, Vitest and scripts | Server only   |

- **Always** add `import "server-only";` at the top of every `*.service.ts` and of modules in `lib/` that use secrets.
- **Always** check the session and that the resource belongs to the user inside every action and every service. Never trust a `userId` coming from the client.
- **Never** call the database from a component. Components call services.
- **Prefer** server actions over route handlers for the app's own mutations.
- **Never** import an external SDK (OpenAI, Anthropic, AWS) directly outside `lib/` or its service. The rest of the code depends on the abstraction.

---

## 8. Utils and helpers

Both contain **pure functions**: no side effects, no network, database or system clock access. The same input always gives the same output.

- **`*.utils.ts`:** generic functions with no business knowledge. Example: `chunk`, `normalizeWhitespace`.
- **`*.helpers.ts`:** functions with domain logic. Example: `isInternalTransfer`, `calculateRealSpending`.
- **Always** use generics when the function is reusable.
- **Never** depend on `Date.now()` or `Math.random()` inside a pure function. Take them as parameters so it's testable.

```typescript
// ✅ Pure and testable: the reference date comes in as a parameter
export const isWithinPeriod = (date: LocalDate, period: Period): boolean =>
  date >= period.from && date <= period.to;
```

---

## 9. Constants and environment variables

### Constants (`*.constants.ts`)

Fixed application values, defined at development time, that don't change at runtime.

- **Always** in `UPPER_SNAKE_CASE`.
- **Always** with `as const` on objects and arrays.
- **Never** put secrets or values that change between environments here.

```typescript
// statement.constants.ts
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PDF_PAGES = 30;
export const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
] as const;
```

### Environment variables

- **Always** validate environment variables with a Zod schema at startup (`lib/env.ts`). The app must not start if one is missing.
- **Always** access them through that module, never via `process.env` directly in the rest of the code.
- **Never** use the `NEXT_PUBLIC_` prefix for anything that shouldn't be visible to anyone in the browser.
- **Never** commit `.env*` files with real values to the repository. Only `.env.example`.

---

## 10. Client state

Before adding global state, walk down this ladder and use the **first level that solves the problem**:

1. **Server data** fetched in Server Components.
2. **URL** (`searchParams`) for filters, period and tabs. The link can be shared and survives reloads.
3. Local **`useState` / `useReducer`**.
4. **Context** for a small subtree (for example, a multi-step form).
5. **Zustand**, only for client state shared between distant components that changes frequently.

If Zustand is used:

- One store per domain in `features/<feature>/<feature>.store.ts`.
- Exported hook in `camelCase` with the `use` prefix: `useUploadQueueStore`.
- **Never** store in Zustand data that already comes from the server, nor persist financial data in `localStorage`.
- Use selectors to subscribe only to what the component needs.

---

## 11. Money and dates

This is a financial product. Errors here are the most serious.

### Money

- **Always** represent amounts as **integers in minor units** (cents): `amountMinor: number`. In Postgres, a `bigint` column.
- **Always** pair the amount with its currency (`currency: "COP"`, ISO 4217).
- **Never** do arithmetic with floating-point decimals (`0.1 + 0.2`). Convert to cents when reading the file and format only for display.
- **Always** format with `Intl.NumberFormat` in the UI layer.
- Money functions live in `packages/core` and have tests.

### Dates

- **Always** store a transaction's date as a **date without time** (`date` column in Postgres; `LocalDate` type = `"YYYY-MM-DD"` in TypeScript). A transaction happens "on August 4", not at a UTC instant.
- **Always** convert to a local date in the parser, when reading the file, using the bank's time zone (default `America/Bogota`).
- **Never** use `new Date(string)` to interpret dates from a statement.
- **Always** use `date-fns` and `@date-fns/tz`. No manual date manipulation.
- For real instants (when a file was uploaded), use `timestamptz` in UTC.

---

## 12. Error handling

- **Expected errors** (invalid file, unknown format, limit reached) → are **returned** as values, not thrown.
- **Unexpected errors** (bug, provider outage) → are **thrown**, caught by `error.tsx` or Inngest, and reported to Sentry.
- **Never** leave an empty `catch` or a `catch` that only does `console.log`.
- **Always** tell the user what happened and what they can do, in plain language. Never a technical message or a stack trace.

```typescript
// packages/core/src/result/result.types.ts
export type Result<T, E = AppError> =
  { ok: true; value: T } | { ok: false; error: E };

// A server action always returns a Result
export async function uploadStatement(
  input: unknown,
): Promise<Result<{ statementId: string }>> {
  const parsed = uploadStatementSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: { code: "INVALID_INPUT" } };
  // ...
}
```

- Parsers also return a list of **warnings** (discarded rows, balance that doesn't reconcile) so the ingestion agent can decide whether to retry or ask for confirmation.

---

## 13. Privacy and security

- **Never** log to logs, Sentry, PostHog or Langfuse: transaction descriptions, amounts, names, ID numbers, account numbers or phone numbers. Log internal identifiers and counts.
- **Always** run text through `redactPii()` (from `packages/core`) before sending it to an LLM.
- **Never** send or store a PDF's password. It is used only in the browser to open the file.
- **Always** isolate data per user: filter by `userId` in every query, with Row-Level Security in Postgres as a second barrier.
- **Never** commit real statements to the repository. Fixtures must be anonymized or synthetic. The `fixtures/private/` folder is in `.gitignore` and is the only place real files may live for local development.
- **Always** store identifiable third parties (destination phone numbers) as a hash, never in plain text.
- **Always** delete the original file from storage after processing it.

---

## 14. LLMs and agents

- **Always** call the LLM through a single module (`lib/ai`). No other file imports the provider's SDK.
- **Always** request structured output and validate it with Zod. If validation fails, retry once with the fallback model; if it fails again, return an expected error.
- **Never** let the LLM do financial calculations. The LLM classifies, extracts and explains; totals and balances are computed in deterministic code.
- **Always** check the user's usage limit and cost cap **before** calling the model.
- **Always** version prompts as files in the repository (`prompts/<name>.v<n>.ts`), not as loose strings in the code.
- **Always** log model, tokens, cost and latency of every call to Langfuse, without sensitive content.
- **Prefer** typed tools over model-generated SQL or code. Generated code is executed only in a sandbox.

---

## 15. Testing

- **Vitest** for unit and integration tests; **Playwright** for end-to-end.
- **Always** put the test next to the file it tests: `normalize.ts` → `normalize.test.ts`.
- **Always** test what is critical, where a bug costs users money, privacy or trust:
  - Money and dates: amounts in minor units, local dates, bank parsers and reconciliation.
  - Personal data: `redactPii`, hashing, masking, and anything that decides what leaves the browser or reaches logs, analytics or an LLM.
  - Data isolation and access: Row-Level Security, session and ownership checks in server actions, account deletion and data export.
  - Deduplication: fingerprints, re-uploads and overlapping statements never count a movement twice.
  - The numbers users read: real spending vs money that moved, summaries, recurring payments and insights.
  - Usage limits and LLM cost caps.
- **Avoid** tests for trivial code: constants, types, schemas without rules of their own, re-exports, configuration, presentational components and one-line glue. TypeScript, ESLint and the tests of the code that uses them already check it.
- There is no coverage target. Critical code is tested when its rules, edge cases and failure modes have tests, not when every line runs.
- **Always**, when adding a new bank or format, add its anonymized fixture and its test, including balance validation.
- **Always**, when fixing a bug, first add the test that reproduces it.
- Test names describe behavior: `it("converts a 05:00 UTC date to the correct local day")`.
- LLM evals live in `packages/evals` and run in CI. A PR that drops accuracy below the defined threshold is not merged.

---

## 16. Git and commits

- **Conventional Commits:** `type(scope): description`. Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`.
  - Example: `feat(parsers): support Bancolombia quarterly statement`.
- One commit = one logical change. Don't mix refactoring with new functionality.
- Branches: `<type>/<phase>-<short-description>`, with the commit type and the roadmap phase id: `feat/1.2-money-minor-units`, `docs/0.8-readme-adr`. Work that belongs to no phase omits it: `fix/<short-description>`.
- Significant architecture decisions are documented as an ADR in `docs/adr/NNNN-title.md`: context, decision, alternatives considered and consequences.

---

## 17. Checklist before opening a PR

- [ ] `pnpm turbo check-types lint test` passes with no errors.
- [ ] No `any`, `console.log`, commented-out code or `TODO` without an issue.
- [ ] Every new external input is validated with Zod.
- [ ] Amounts are in cents and transaction dates are `LocalDate`.
- [ ] No log, event or trace includes financial or personal data.
- [ ] Every new query filters by `userId`.
- [ ] New components are server components unless they need interactivity.
- [ ] The new critical logic has tests (section 15) and, where applicable, an anonymized fixture.
- [ ] If an architecture decision was made, there is an ADR.
