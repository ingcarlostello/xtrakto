import { Client } from "pg";
import { testDatabase } from "./test-database";

const CONNECTION_TIMEOUT_MS = 3_000;

// Runs once before the test files: when the test database is configured but
// unreachable, fail at once and say what to do, instead of in every test.
export const setup = async (): Promise<void> => {
  if (!testDatabase) return;
  const owner = new Client({
    connectionString: testDatabase.ownerUrl,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });
  try {
    await owner.connect();
  } catch (error) {
    throw new Error(
      "The test database isn't reachable. Start it with `docker compose up --wait`, or remove TEST_DATABASE_URL and TEST_DATABASE_MIGRATION_URL from .env.local to skip the database tests.",
      { cause: error },
    );
  }
  await owner.end();
};
