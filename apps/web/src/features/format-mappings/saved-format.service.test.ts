import { randomUUID } from "node:crypto";
import { type FormatMapping, formatMappingSchema } from "@xtrakto/core";
import {
  createDb,
  type DbClient,
  findOrCreateUser,
  findUserId,
  saveOwnFormatMapping,
  shareFormatMapping,
  withUserContext,
} from "@xtrakto/db";
import { requireTestDatabase, testDatabase } from "@xtrakto/db/testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { findSavedMapping } from "./saved-format.service";

// The database is the test one, as the application role.
const mocks = vi.hoisted(() => ({ db: undefined as unknown }));

vi.mock("@/lib/db", () => ({ getDb: () => mocks.db }));

// A header of its own for each test, since shared mappings stay.
const mappingWithNewHeader = (): FormatMapping =>
  formatMappingSchema.parse({
    header: ["FECHA", `DETALLE ${randomUUID()}`, "VALOR", "SALDO"],
    columns: ["date", "description", "amount", "balance"],
    dateOrder: "dmy",
    decimalSeparator: ",",
    bankId: "other",
  });

const newClerkId = () => `user_saved_format_${randomUUID()}`;

describe.skipIf(!testDatabase)("findSavedMapping", () => {
  let app: DbClient;

  beforeAll(() => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    mocks.db = app.db;
  });

  afterAll(async () => {
    await app.pool.end();
  });

  const userWith = async (
    save: typeof saveOwnFormatMapping | typeof shareFormatMapping,
    mapping: FormatMapping,
  ) => {
    const clerkUserId = newClerkId();
    const userId = await findOrCreateUser(app.db, clerkUserId);
    await withUserContext(app.db, userId, async (ctx) => {
      await save(ctx, mapping);
    });
    return clerkUserId;
  };

  it("finds the mapping the user confirmed for a header", async () => {
    const mapping = mappingWithNewHeader();
    const clerkUserId = await userWith(saveOwnFormatMapping, mapping);

    expect(await findSavedMapping(clerkUserId, mapping.header)).toEqual(
      mapping,
    );
  });

  it("finds the one everyone shares, for a user who never saw the format", async () => {
    const mapping = mappingWithNewHeader();
    await userWith(shareFormatMapping, mapping);

    expect(await findSavedMapping(newClerkId(), mapping.header)).toEqual(
      mapping,
    );
  });

  it("finds none for a header no one saved, and keeps another user's to them", async () => {
    const mapping = mappingWithNewHeader();
    await userWith(saveOwnFormatMapping, mapping);

    expect(
      await findSavedMapping(newClerkId(), mappingWithNewHeader().header),
    ).toBeUndefined();
    expect(
      await findSavedMapping(newClerkId(), mapping.header),
    ).toBeUndefined();
  });

  it("creates the user's row for their first lookup", async () => {
    const clerkUserId = newClerkId();
    await findSavedMapping(clerkUserId, mappingWithNewHeader().header);

    expect(await findUserId(app.db, clerkUserId)).toBeDefined();
  });
});
