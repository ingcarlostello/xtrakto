import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { CreateDbOptions, DbClient } from "./db-client.types";

// node-postgres emits "error" when an idle connection dies, for example when
// Neon suspends an idle database or Docker restarts. The pool has already
// dropped that connection and opens a new one for the next query, which fails
// on its own if the database is still down; without a listener, Node crashes.
const ignoreIdleConnectionError = (): void => {};

/** Opens a pool of connections to PostgreSQL and wraps it with Drizzle. */
export const createDb = ({
  connectionString,
  maxConnections,
}: CreateDbOptions): DbClient => {
  const pool = new Pool({ connectionString, max: maxConnections });
  pool.on("error", ignoreIdleConnectionError);
  return { db: drizzle({ client: pool }), pool };
};
