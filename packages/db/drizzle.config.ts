import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't read the root `.env.local`; variables already set win.
const rootEnvFile = new URL("../../.env.local", import.meta.url);
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

// drizzle-kit runs outside Turborepo, so turbo.json doesn't declare it.
// eslint-disable-next-line turbo/no-undeclared-env-vars
const migrationUrl = process.env.DATABASE_MIGRATION_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/**/*.schemas.ts",
  out: "./migrations",
  // Only `migrate` and `studio` connect, as the owner role; `generate`
  // compares the schema with the earlier migrations.
  ...(migrationUrl ? { dbCredentials: { url: migrationUrl } } : {}),
});
