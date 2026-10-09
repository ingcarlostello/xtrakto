import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";

export type Database = NodePgDatabase;

/** The transaction Drizzle passes to the callback of `db.transaction`. */
export type DbTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

export type DbClient = {
  readonly db: Database;
  /** The caller's to end (`pool.end()`) when done, as scripts and tests must. */
  readonly pool: Pool;
};

export type CreateDbOptions = {
  readonly connectionString: string;
  /** Connections the pool may open; node-postgres defaults to 10. */
  readonly maxConnections?: number;
};
