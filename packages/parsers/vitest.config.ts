import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Private tests read real exports and run only with `test:private`.
    exclude: [...configDefaults.exclude, "**/*.private.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
