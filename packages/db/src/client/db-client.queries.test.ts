import { sql } from "drizzle-orm";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { createDb } from "./db-client.queries";
import type { DbClient } from "./db-client.types";

describe.skipIf(!testDatabase)("createDb", () => {
  let app: DbClient;
  let owner: Client;

  beforeAll(async () => {
    const { appUrl, ownerUrl } = requireTestDatabase();
    app = createDb({ connectionString: appUrl, maxConnections: 1 });
    owner = new Client({ connectionString: ownerUrl });
    await owner.connect();
  });

  afterAll(async () => {
    await app.pool.end();
    await owner.end();
  });

  it("connects as the application role, which can't bypass Row-Level Security", async () => {
    const { rows } = await app.db.execute(sql`
      select current_user as role, rolsuper as superuser, rolbypassrls as bypasses_rls
      from pg_roles where rolname = current_user`);

    const { appUrl } = requireTestDatabase();
    expect(rows).toEqual([
      {
        role: new URL(appUrl).username,
        superuser: false,
        bypasses_rls: false,
      },
    ]);
  });

  it("keeps working after the server closes an idle connection", async () => {
    const { rows } = await app.db.execute<{ pid: number }>(
      sql`select pg_backend_pid() as pid`,
    );
    const terminated = await owner.query<{ done: boolean }>(
      "select pg_terminate_backend($1) as done",
      [rows[0]?.pid],
    );
    expect(terminated.rows).toEqual([{ done: true }]);

    // The pool drops the dead connection; without createDb's listener for
    // its "error" event, the process would crash here.
    await vi.waitFor(() => expect(app.pool.totalCount).toBe(0));
    const after = await app.db.execute(sql`select 1 as ok`);
    expect(after.rows).toEqual([{ ok: 1 }]);
  });
});
