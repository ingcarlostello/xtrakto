// Loads the synthetic fixtures for a development user, through the same
// functions ingestion will use: parse, reconcile, prepare, save. Local
// databases only. Run with `pnpm db:seed`; a second run inserts nothing.
import { existsSync, readFileSync } from "node:fs";
import {
  extractedContentSchema,
  type ParsedStatement,
  prepareStatement,
} from "@xtrakto/core";
import {
  createDb,
  findOrCreateAccount,
  findOrCreateUser,
  saveStatement,
  withUserContext,
} from "@xtrakto/db";
import { findParser, reconcile } from "@xtrakto/parsers";

const ROOT = new URL("../../../", import.meta.url);
const ENV_FILE = new URL(".env.local", ROOT);
const FIXTURES = new URL("packages/parsers/fixtures/", ROOT);
// One account and no overlapping periods: matching movements across formats
// comes in Stage 10.
const FIXTURE_FILES = [
  "quarterly-basic.json",
  "quarterly-year-rollover.json",
  "movements-basic.json",
];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const DEFAULT_CLERK_USER_ID = "user_dev_seed";

if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const env = (name: string): string | undefined => process.env[name];

const requiredEnv = (name: string): string => {
  const value = env(name);
  if (!value)
    throw new Error(`${name} is missing: set it in the root .env.local.`);
  return value;
};

const parseFixture = (file: string): ParsedStatement => {
  const json: unknown = JSON.parse(
    readFileSync(new URL(file, FIXTURES), "utf8"),
  );
  const content = extractedContentSchema.parse(json);
  const parser = findParser(content);
  if (!parser.ok) throw new Error(`${file}: no parser recognizes it.`);
  const parsed = parser.value.parse(content);
  if (!parsed.ok) throw new Error(`${file}: ${parsed.error.code}`);
  return parsed.value;
};

const databaseUrl = requiredEnv("DATABASE_URL");
if (!LOCAL_HOSTS.has(new URL(databaseUrl).hostname))
  throw new Error("The seed only writes to a local database.");
const identifierHashKey = requiredEnv("IDENTIFIER_HASH_KEY");
const clerkUserId = env("SEED_CLERK_USER_ID") || DEFAULT_CLERK_USER_ID;

const fixtures = FIXTURE_FILES.map((file) => ({
  file,
  parsed: parseFixture(file),
}));
// The movements export carries no account number: the user picks the account
// at upload, so here it goes to the quarterly statements' account.
const last4 = fixtures.find(({ parsed }) => parsed.accountLast4)?.parsed
  .accountLast4;
if (!last4) throw new Error("No fixture identifies the account.");

const { db, pool } = createDb({ connectionString: databaseUrl });
try {
  const userId = await findOrCreateUser(db, clerkUserId);
  for (const { file, parsed } of fixtures) {
    const statement = await prepareStatement(parsed, identifierHashKey);
    const result = await withUserContext(db, userId, async (ctx) => {
      const accountId = await findOrCreateAccount(ctx, {
        bankId: parsed.bankId,
        accountType: parsed.accountType,
        last4: parsed.accountLast4 ?? last4,
        currency: parsed.currency,
      });
      return saveStatement(ctx, {
        accountId,
        balanceVerified: reconcile(parsed).balanceVerified,
        statement,
      });
    });
    if (!result.ok) throw new Error(`${file}: ${result.error.code}`);
    const { inserted, skipped } = result.value;
    process.stdout.write(
      `${file}: ${inserted} inserted, ${skipped} already saved\n`,
    );
  }
} finally {
  await pool.end();
}
