import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) =>
  fileURLToPath(new URL(path, import.meta.url));

// The test database's URLs, from the root `.env.local` on a laptop; variables
// already set, as in CI, win. Only those: no test should see the app's keys.
const TEST_DATABASE_VARIABLES = [
  "TEST_DATABASE_URL",
  "TEST_DATABASE_MIGRATION_URL",
];
const rootEnvFile = new URL("../../.env.local", import.meta.url);
if (existsSync(rootEnvFile)) {
  const variables = parseEnv(readFileSync(rootEnvFile, "utf8"));
  for (const name of TEST_DATABASE_VARIABLES) {
    const value = variables[name];
    if (value !== undefined) process.env[name] ??= value;
  }
}

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // The real package throws outside React Server Components.
      "server-only": fromRoot("./test/empty-module.ts"),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["./test/global-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
