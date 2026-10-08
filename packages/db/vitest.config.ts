import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Vitest doesn't read the root `.env.local`, where the test database URLs live
// on a laptop; variables already set, as in CI, win.
const rootEnvFile = new URL("../../.env.local", import.meta.url);
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./test/global-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
