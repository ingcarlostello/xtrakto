import eslintConfigPrettier from "eslint-config-prettier";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { globalIgnores } from "eslint/config";
import { projectRules } from "./project-rules.js";

/**
 * ESLint configuration for the Next.js app: the official Next.js presets
 * (React, hooks, accessibility, imports, TypeScript) plus the project rules.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const nextJsConfig = [
  ...nextVitals,
  ...nextTs,
  ...projectRules,
  eslintConfigPrettier,
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
];
