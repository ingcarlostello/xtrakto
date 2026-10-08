/**
 * The integration tests' database: TEST_DATABASE_URL connects as the
 * application role, TEST_DATABASE_MIGRATION_URL as the owner. Without them the
 * database tests are skipped, except in CI, where skipping would hide failures.
 */
export type TestDatabase = {
  readonly appUrl: string;
  readonly ownerUrl: string;
};

type TestEnv = Readonly<Record<string, string | undefined>>;

const LOCAL_HOSTS: ReadonlySet<string> = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
]);
const TEST_DATABASE_SUFFIX = "_test";

// Tests write to this database, so it must be a local one meant for them.
// Errors name the host and the database, never the URL: it holds a password.
const assertLocalTestDatabase = (name: string, value: string): void => {
  if (!URL.canParse(value)) throw new Error(`${name} is not a valid URL.`);
  const url = new URL(value);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (LOCAL_HOSTS.has(url.hostname) && database.endsWith(TEST_DATABASE_SUFFIX))
    return;
  throw new Error(
    `${name} points to ${url.hostname}/${database}, but the integration tests only run on a local database whose name ends in "${TEST_DATABASE_SUFFIX}".`,
  );
};

export const readTestDatabase = (env: TestEnv): TestDatabase | undefined => {
  const appUrl = env.TEST_DATABASE_URL;
  const ownerUrl = env.TEST_DATABASE_MIGRATION_URL;
  if (!appUrl && !ownerUrl) {
    if (env.CI)
      throw new Error(
        "CI must set TEST_DATABASE_URL and TEST_DATABASE_MIGRATION_URL, or the database tests would be skipped.",
      );
    return undefined;
  }
  if (!appUrl || !ownerUrl)
    throw new Error(
      "Set both TEST_DATABASE_URL and TEST_DATABASE_MIGRATION_URL, or neither.",
    );
  assertLocalTestDatabase("TEST_DATABASE_URL", appUrl);
  assertLocalTestDatabase("TEST_DATABASE_MIGRATION_URL", ownerUrl);
  return { appUrl, ownerUrl };
};

export const testDatabase = readTestDatabase(process.env);

/** For code that runs only when the database tests aren't skipped. */
export const requireTestDatabase = (): TestDatabase => {
  if (!testDatabase)
    throw new Error("The database tests should have been skipped.");
  return testDatabase;
};
