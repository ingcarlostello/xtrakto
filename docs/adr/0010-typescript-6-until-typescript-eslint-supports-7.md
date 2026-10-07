# 0010. TypeScript 6.0 until typescript-eslint supports TypeScript 7

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

The repository template installed TypeScript 7.0.2. The Phase 0.1 audit found that the TypeScript 7 package exports no JavaScript compiler API (only `version` and `versionMajorMinor`). typescript-eslint, which `eslint-config-next` uses, needs that API and supports TypeScript `<6.1` in its latest and canary releases. Next.js 16.3 supports TypeScript 7 for `next build` through the `tsc` command line.

## Decision

Pin TypeScript 6.0.3 at the root and in every package. TypeScript 6.0 is the last release built on the JavaScript codebase and type-checks the same way as TypeScript 7. Its new defaults (no automatic `@types`, `strict` on) are handled by setting `types` explicitly in every tsconfig.

## Alternatives considered

- **TypeScript 7 without typescript-eslint:** lint with the Babel parser instead, losing typed lint rules and the TypeScript rules in `eslint-config-next`.
- **TypeScript 7 for type checking and TypeScript 6 for ESLint:** two compilers that can disagree, and a more complex setup.

## Consequences

- Type checking doesn't get TypeScript 7's speed, which matters little at this codebase's size.
- Revisit when typescript-eslint's `typescript` peer range includes 7: upgrade every package in one change and run `check-types`, `lint` and `build`.
