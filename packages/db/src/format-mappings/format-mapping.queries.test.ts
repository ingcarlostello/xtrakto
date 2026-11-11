import { randomUUID } from "node:crypto";
import { formatFingerprint, formatMappingSchema } from "@xtrakto/core";
import type { FormatMapping } from "@xtrakto/core";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { pgErrorCode } from "../../test/test-rows";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserContext, UserId } from "../user-context/user-context.types";
import { findOrCreateUser } from "../users/user.queries";
import {
  findFormatMapping,
  saveOwnFormatMapping,
  shareFormatMapping,
} from "./format-mapping.queries";
import { formatMappings, userFormatMappings } from "./format-mapping.schemas";

const PERMISSION_DENIED = "42501";

// Other test files share the table, so each test reads a header of its own.
const newHeader = () => ["FECHA", `DETALLE ${randomUUID()}`, "VALOR", "SALDO"];

const mappingOf = (
  header: readonly string[],
  changes: Partial<FormatMapping> = {},
): FormatMapping =>
  formatMappingSchema.parse({
    header,
    columns: ["date", "description", "amount", "balance"],
    dateOrder: "dmy",
    decimalSeparator: ",",
    bankId: "other",
    ...changes,
  });

describe.skipIf(!testDatabase)("saved format mappings", () => {
  let app: DbClient;
  let owner: DbClient;

  beforeAll(() => {
    const { appUrl, ownerUrl } = requireTestDatabase();
    app = createDb({ connectionString: appUrl });
    owner = createDb({ connectionString: ownerUrl });
  });

  afterAll(async () => {
    await app.pool.end();
    await owner.pool.end();
  });

  const newUser = () => findOrCreateUser(app.db, `test_${randomUUID()}`);

  const inContext = <T>(
    userId: UserId,
    run: (ctx: UserContext) => Promise<T>,
  ) => withUserContext(app.db, userId, run);

  const findFor = (userId: UserId, header: readonly string[]) =>
    inContext(userId, (ctx) => findFormatMapping(ctx, header));

  it("finds none for a format nobody saved", async () => {
    expect(await findFor(await newUser(), newHeader())).toBeUndefined();
  });

  it("reads a person's mapping for them alone", async () => {
    const header = newHeader();
    const mapping = mappingOf(header);
    const person = await newUser();
    await inContext(person, (ctx) => saveOwnFormatMapping(ctx, mapping));

    expect(await findFor(person, header)).toEqual({
      mapping,
      isShared: false,
    });
    expect(await findFor(await newUser(), header)).toBeUndefined();
  });

  it("reads a shared mapping for everyone, linked to no one", async () => {
    const header = newHeader();
    const mapping = mappingOf(header);
    const shared = await inContext(await newUser(), (ctx) =>
      shareFormatMapping(ctx, mapping),
    );

    expect(shared).toBe(true);
    expect(await findFor(await newUser(), header)).toEqual({
      mapping,
      isShared: true,
    });
  });

  it("reads a person's mapping before the shared one", async () => {
    const header = newHeader();
    const person = await newUser();
    const theirs = mappingOf(header, { dateOrder: "mdy" });
    await inContext(await newUser(), (ctx) =>
      shareFormatMapping(ctx, mappingOf(header)),
    );
    await inContext(person, (ctx) => saveOwnFormatMapping(ctx, theirs));

    expect(await findFor(person, header)).toEqual({
      mapping: theirs,
      isShared: false,
    });
  });

  it("replaces a person's mapping with their next confirmation", async () => {
    const header = newHeader();
    const person = await newUser();
    const corrected = mappingOf(header, { bankId: "davivienda" });
    await inContext(person, async (ctx) => {
      await saveOwnFormatMapping(ctx, mappingOf(header));
      await saveOwnFormatMapping(ctx, corrected);
    });

    expect(await findFor(person, header)).toEqual({
      mapping: corrected,
      isShared: false,
    });
    const fingerprint = await formatFingerprint(header);
    const rows = await owner.db
      .select()
      .from(userFormatMappings)
      .where(eq(userFormatMappings.fingerprint, fingerprint));
    expect(rows).toHaveLength(1);
  });

  it("keeps the first mapping shared for a format", async () => {
    const header = newHeader();
    const first = mappingOf(header);
    const shared = await inContext(await newUser(), async (ctx) => [
      await shareFormatMapping(ctx, first),
      await shareFormatMapping(ctx, mappingOf(header, { bankId: "nu" })),
    ]);

    expect(shared).toEqual([true, false]);
    expect(await findFor(await newUser(), header)).toEqual({
      mapping: first,
      isShared: true,
    });
  });

  it("counts a mapping the schema no longer reads as none", async () => {
    const header = newHeader();
    const fingerprint = await formatFingerprint(header);
    await owner.db
      .insert(formatMappings)
      .values({ fingerprint, mapping: { header, columns: ["fecha"] } });

    expect(await findFor(await newUser(), header)).toBeUndefined();
  });

  it("lets no user change or delete a shared mapping, nor delete their own", async () => {
    const header = newHeader();
    const person = await newUser();
    await inContext(person, async (ctx) => {
      await shareFormatMapping(ctx, mappingOf(header));
      await saveOwnFormatMapping(ctx, mappingOf(header));
    });

    const attempts = [
      (ctx: UserContext) =>
        ctx.tx.update(formatMappings).set({ mapping: mappingOf(newHeader()) }),
      (ctx: UserContext) => ctx.tx.delete(formatMappings),
      (ctx: UserContext) => ctx.tx.delete(userFormatMappings),
    ];
    for (const attempt of attempts) {
      expect(await pgErrorCode(inContext(person, attempt))).toBe(
        PERMISSION_DENIED,
      );
    }
  });
});
