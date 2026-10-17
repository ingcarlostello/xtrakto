import { defineConfig } from "vitest/config";

// Runs only the private tests, against the real exports in fixtures/private/.
// The verbose reporter prints their annotations (percentages only), which
// Vitest's minimal reporter would hide when an agent runs them.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.private.test.ts"],
    reporters: ["verbose"],
  },
});
