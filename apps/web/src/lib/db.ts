import "server-only";
import { createDb, type Database } from "@xtrakto/db";
import { getDatabaseUrl } from "./env";

let database: Database | undefined;

/**
 * The database as the application role. One connection pool per server
 * instance, opened on first use, so builds and tests don't need it.
 */
export const getDb = (): Database => {
  database ??= createDb({ connectionString: getDatabaseUrl() }).db;
  return database;
};
