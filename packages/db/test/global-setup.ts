import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { createDb } from "../src/client/db-client.queries";
import { testDatabase } from "./test-database";

const CONNECTION_TIMEOUT_MS = 3_000;
const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../migrations", import.meta.url),
);

const assertReachable = async (ownerUrl: string): Promise<void> => {
  const owner = new Client({
    connectionString: ownerUrl,
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

// Runs once before the test files: rebuilds the test database from the
// migrations, so every run proves they apply to an empty database.
export const setup = async (): Promise<void> => {
  if (!testDatabase) return;
  await assertReachable(testDatabase.ownerUrl);
  const { db, pool } = createDb({
    connectionString: testDatabase.ownerUrl,
    maxConnections: 1,
  });
  try {
    const { rows } = await db.execute<{ name: string }>(
      sql`select current_database() as name`,
    );
    if (!rows[0]?.name.endsWith("_test"))
      throw new Error("Refusing to reset a database not named *_test.");
    await db.execute(
      sql.raw(`drop schema if exists drizzle cascade;
        drop schema public cascade;
        create schema public authorization pg_database_owner;
        grant usage on schema public to public;`),
    );
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await pool.end();
  }
};
