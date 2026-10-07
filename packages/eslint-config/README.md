# `@xtrakto/eslint-config`

Shared ESLint configurations for the monorepo (ESLint 9, flat config).

| Preset | For | Includes |
|---|---|---|
| `@xtrakto/eslint-config/base` | Internal packages | ESLint and typescript-eslint recommended rules, project rules |
| `@xtrakto/eslint-config/next` | `apps/web` | `eslint-config-next` (core web vitals and TypeScript), project rules |

`project-rules.js` automates the project rules ESLint can check: `any`, `enum` and deep imports into another package are errors; size limits and `console` are warnings, relaxed for tests and fixtures.

```js
// eslint.config.mjs
import { config } from "@xtrakto/eslint-config/base";

export default config;
```
