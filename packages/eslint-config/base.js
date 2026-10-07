import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import { projectRules } from "./project-rules.js";

/**
 * ESLint configuration for internal packages (pure TypeScript, no React).
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...projectRules,
  eslintConfigPrettier,
  {
    ignores: ["dist/**", "coverage/**"],
  },
];
