import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { pgErrorCode } from "../../test/test-rows";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import {
  addWaitlistEntry,
  type NewWaitlistEntry,
} from "./waitlist-entry.queries";
import { waitlistEntries } from "./waitlist-entry.schemas";

const PERMISSION_DENIED = "42501";
const CHECK_VIOLATION = "23514";

// Each test adds its own random address, so files can run in parallel.
const newEntry = (): NewWaitlistEntry => ({
  name: "Ana Prueba",
  email: `${randomUUID()}@example.com`,
  consentVersion: "2026-10-15",
});

describe.skipIf(!testDatabase)("waitlist entry queries", () => {
  let app: DbClient;
  let owner: DbClient;

  beforeAll(() => {
    const { appUrl, ownerUrl } = requireTestDatabase();
    app = createDb({ connectionString: appUrl, maxConnections: 2 });
    owner = createDb({ connectionString: ownerUrl });
  });

  afterAll(async () => {
    await app.pool.end();
    await owner.pool.end();
  });

  // Read as the owner: the application can't read the list.
  const entriesFor = (email: string) =>
    owner.db
      .select()
      .from(waitlistEntries)
      .where(eq(waitlistEntries.email, email));

  // The consent's time is the insert's, never one a browser could send.
  it("adds someone with the consent's version, timed by the database", async () => {
    const entry = newEntry();

    await addWaitlistEntry(app.db, entry);

    const [saved] = await entriesFor(entry.email);
    expect(saved).toMatchObject(entry);
    expect(saved?.consentAcceptedAt).toEqual(saved?.createdAt);
  });

  it("keeps the first entry when the same email joins again, without an error", async () => {
    const first = newEntry();
    await addWaitlistEntry(app.db, first);

    await expect(
      addWaitlistEntry(app.db, {
        ...first,
        name: "Otra Persona",
        consentVersion: "later",
      }),
    ).resolves.toBeUndefined();

    const saved = await entriesFor(first.email);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject(first);
  });

  it("lets the application add people, never read, change or remove them", async () => {
    const entry = newEntry();
    await addWaitlistEntry(app.db, entry);
    const byEmail = eq(waitlistEntries.email, entry.email);

    const attempts = [
      app.db.select().from(waitlistEntries),
      app.db.update(waitlistEntries).set({ name: "Cambiado" }).where(byEmail),
      app.db.delete(waitlistEntries).where(byEmail),
      app.db.execute(sql`truncate ${waitlistEntries}`),
      app.db
        .insert(waitlistEntries)
        .values(newEntry())
        .returning({ id: waitlistEntries.id }),
    ];
    for (const attempt of attempts)
      expect(await pgErrorCode(attempt)).toBe(PERMISSION_DENIED);
    expect(await entriesFor(entry.email)).toHaveLength(1);
  });

  // Why addWaitlistEntry names no conflict target: one needs to read the table.
  it("refuses an insert that names the email as its conflict target", async () => {
    const insert = app.db
      .insert(waitlistEntries)
      .values(newEntry())
      .onConflictDoNothing({ target: waitlistEntries.email });

    expect(await pgErrorCode(insert)).toBe(PERMISSION_DENIED);
  });

  it.each([
    ["an email in capitals", { email: `ANA-${randomUUID()}@EXAMPLE.COM` }],
    ["an email with spaces around", { email: ` ${randomUUID()}@example.com` }],
    [
      "an email over 254 characters",
      { email: `${"a".repeat(250)}@example.com` },
    ],
    ["an empty name", { name: "" }],
    ["a name with spaces around", { name: " Ana " }],
    ["a name over 100 characters", { name: "a".repeat(101) }],
    ["an empty consent version", { consentVersion: "" }],
  ])("refuses %s", async (_, change) => {
    const insert = owner.db
      .insert(waitlistEntries)
      .values({ ...newEntry(), ...change });

    expect(await pgErrorCode(insert)).toBe(CHECK_VIOLATION);
  });
});
