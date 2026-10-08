import { defineConfig } from "vitest/config";

// Runs only the private tests, against the real exports in fixtures/private/.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.private.test.ts"],
  },
});
