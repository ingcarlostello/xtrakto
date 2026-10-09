import { type SQL, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";

// Guards the RLS setup in the catalog, so a future table or migration that
// misses a piece fails here instead of exposing data.

const APP_ROLE = "xtrakto_app";
const TABLE_PRIVILEGES = [
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "TRUNCATE",
  "REFERENCES",
  "TRIGGER",
  "MAINTAIN",
] as const;
const READ_WRITE = ["SELECT", "INSERT", "UPDATE", "DELETE"];
const EXPECTED_PRIVILEGES: Readonly<Record<string, readonly string[]>> = {
  users: ["SELECT", "INSERT", "DELETE"],
  accounts: READ_WRITE,
  statements: READ_WRITE,
  transactions: READ_WRITE,
  ingestion_jobs: READ_WRITE,
};

describe.skipIf(!testDatabase)("Row-Level Security in the catalog", () => {
  let owner: DbClient;

  beforeAll(() => {
    owner = createDb({ connectionString: requireTestDatabase().ownerUrl });
  });

  afterAll(async () => {
    await owner.pool.end();
  });

  const rowsOf = async <T extends Record<string, unknown>>(query: SQL) => {
    const { rows } = await owner.db.execute<T>(query);
    return rows;
  };

  it("forces Row-Level Security on every table, with one per-user policy on each data table", async () => {
    const tables = await rowsOf<{
      name: string;
      enabled: boolean;
      forced: boolean;
      user_id_type: string | null;
      policies: string | null;
    }>(sql`
      select c.relname as name, c.relrowsecurity as enabled, c.relforcerowsecurity as forced,
        (select format_type(a.atttypid, a.atttypmod) || case when a.attnotnull then ' not null' else '' end
           from pg_attribute a where a.attrelid = c.oid and a.attname = 'user_id') as user_id_type,
        (select string_agg(p.permissive || ' ' || p.cmd || ' ' || array_to_string(p.roles, ',')
                  || ' same_check=' || (p.qual is not distinct from p.with_check)::text
                  || ' uses_setting=' || (coalesce(p.qual, '') like '%app.user_id%')::text,
                  '; ' order by p.cmd)
           from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' order by c.relname`);

    const expected = Object.keys(EXPECTED_PRIVILEGES)
      .sort()
      .map((name) =>
        name === "users"
          ? {
              // Anyone may be read or added; only a user's own row deleted.
              name,
              enabled: true,
              forced: true,
              user_id_type: null,
              policies: [
                `PERMISSIVE DELETE ${APP_ROLE} same_check=false uses_setting=true`,
                `PERMISSIVE INSERT ${APP_ROLE} same_check=false uses_setting=false`,
                `PERMISSIVE SELECT ${APP_ROLE} same_check=false uses_setting=false`,
              ].join("; "),
            }
          : {
              name,
              enabled: true,
              forced: true,
              user_id_type: "uuid not null",
              policies: `PERMISSIVE ALL ${APP_ROLE} same_check=true uses_setting=true`,
            },
      );
    expect(tables).toEqual(expected);
  });

  it("keeps the application role unprivileged", async () => {
    const [role] = await rowsOf(sql`
      select rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, rolreplication,
        (select count(*)::int from pg_auth_members m where m.member = r.oid) as memberships,
        (select count(*)::int from pg_class c where c.relowner = r.oid) as owned_relations,
        has_schema_privilege(r.oid, 'public', 'CREATE') as creates_in_public,
        has_schema_privilege(r.oid, 'drizzle', 'USAGE') as sees_migrations
      from pg_roles r where r.rolname = ${APP_ROLE}`);

    expect(role).toEqual({
      rolsuper: false,
      rolbypassrls: false,
      rolcreaterole: false,
      rolcreatedb: false,
      rolreplication: false,
      memberships: 0,
      owned_relations: 0,
      creates_in_public: false,
      sees_migrations: false,
    });
  });

  it("grants the application role exactly the privileges it needs", async () => {
    const granted = await rowsOf<{ name: string; privileges: string[] }>(sql`
      select c.relname as name,
        array(select p from unnest(${sql.raw(`array['${TABLE_PRIVILEGES.join("','")}']`)}) p
              where has_table_privilege(${APP_ROLE}, c.oid, p)) as privileges
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' order by c.relname`);

    expect(
      Object.fromEntries(granted.map((t) => [t.name, t.privileges])),
    ).toEqual(EXPECTED_PRIVILEGES);
  });

  it("has no SECURITY DEFINER function, which would run with its owner's rights", async () => {
    const functions = await rowsOf(sql`
      select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef`);

    expect(functions).toEqual([]);
  });
});
