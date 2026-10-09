import { sql } from "drizzle-orm";
import type { Database, DbTransaction } from "../client/db-client.types";
import { isUserId } from "./user-context.helpers";
import type { UserContext, UserId } from "./user-context.types";

// Databases whose connection role is known to respect Row-Level Security.
const checkedDatabases = new WeakSet<Database>();

// Owners skip Row-Level Security: the local superuser, Neon's neondb_owner. If
// the app ever gets an owner's connection string, fail instead of silently
// showing every user's rows. One query per database object, not per call.
const assertRespectsRls = async (
  db: Database,
  tx: DbTransaction,
): Promise<void> => {
  if (checkedDatabases.has(db)) return;
  const { rows } = await tx.execute<{ bypasses_rls: boolean }>(
    sql`select rolsuper or rolbypassrls as bypasses_rls from pg_roles where rolname = current_user`,
  );
  if (rows[0]?.bypasses_rls !== false)
    throw new Error(
      "withUserContext needs the application role, but this connection's role bypasses Row-Level Security.",
    );
  checkedDatabases.add(db);
};

/**
 * Runs `fn` in a transaction where Row-Level Security shows and accepts only
 * `userId`'s rows. Query through `ctx.tx`, and still filter by `ctx.userId`.
 *
 * The transaction commits when `fn` resolves, even with an `err()` result:
 * validate before writing, and throw to undo writes. It holds one pooled
 * connection until `fn` ends: await its queries one at a time (no
 * `Promise.all` on `tx`), and make no network calls inside.
 */
export const withUserContext = async <T>(
  db: Database,
  userId: UserId,
  fn: (ctx: UserContext) => Promise<T>,
): Promise<T> => {
  if (!isUserId(userId))
    throw new TypeError("withUserContext needs a user id (a UUID).");
  return db.transaction(async (tx) => {
    await assertRespectsRls(db, tx);
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn({ tx, userId });
  });
};
