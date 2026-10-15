import reactHooks from "eslint-plugin-react-hooks";
import { config } from "./base.js";

/**
 * ESLint configuration for React code outside Next.js (the promo video in
 * `apps/video`): the package preset plus the rules of hooks.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const reactConfig = [
  ...config,
  reactHooks.configs.flat.recommended,
  {
    ignores: ["out/**"],
  },
];
