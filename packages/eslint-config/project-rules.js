import turboPlugin from "eslint-plugin-turbo";

/**
 * Automates the "Always / Never" rules in `.claude/rules/project-architecture-rules.md`
 * that ESLint can check. Shared by every preset.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const projectRules = [
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message:
            "Use an `as const` object and derive the union type instead of `enum`.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@xtrakto/*/src", "@xtrakto/*/src/**"],
              message:
                "Import internal packages through their public API (`@xtrakto/<name>`).",
            },
          ],
        },
      ],
      "max-lines": [
        "warn",
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": [
        "warn",
        { max: 40, skipBlankLines: true, skipComments: true },
      ],
      "max-depth": ["warn", 3],
      "max-params": ["warn", 3],
      "no-console": "warn",
    },
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // Table-driven tests and sample data are long by nature.
    files: ["**/*.test.{ts,tsx}", "**/fixtures/**"],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
    },
  },
];
