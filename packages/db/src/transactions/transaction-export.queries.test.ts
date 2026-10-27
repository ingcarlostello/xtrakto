import type { Period } from "@xtrakto/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  preparedExport,
  preparedQuarterly,
  UNCHECKED,
  UNVERIFIED,
  VERIFIED,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { resolveIdentifiedAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { saveStatement } from "../statements/statement.queries";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { findOrCreateUser } from "../users/user.queries";
import {
  type ExportFilter,
  listExportMovements,
} from "./transaction-export.queries";

const KEY_PAYMENT = "PAGO LLAVE Maria Lopez";
const NEQUI_SEND = "TRANSFERENCIAS A NEQUI";
// On a day the verified quarterly statement covers: saved hidden (ADR 0018).
const COVERED = "COMPRA EN TIENDA CUBIERTA";
// In a quarterly statement that doesn't reconcile: it counts nowhere.
const UNRECONCILED = "COMPRA EN TIENDA SIN CUADRAR";
// Another user's: no export of the first may carry it.
const OTHERS = "COMPRA EN TIENDA DE OTRA PERSONA";

describe.skipIf(!testDatabase)("movements export", () => {
  let app: DbClient;
  let userId: UserId;
  let otherUserId: UserId;
  let accountId: string;

  const accountOf = (user: UserId, last4: string) =>
    withUserContext(app.db, user, (ctx) =>
      resolveIdentifiedAccount(ctx, {
        bankId: "bancolombia",
        accountType: "savings",
        last4,
        currency: "COP",
      }),
    );

  const exportOf = (user: UserId, filter?: ExportFilter) =>
    withUserContext(app.db, user, (ctx) => listExportMovements(ctx, filter));

  const textsOf = (rows: readonly { descriptionRaw: string }[]) =>
    rows.map(({ descriptionRaw }) => descriptionRaw);

  beforeAll(async () => {
    app = createDb({ connectionString: requireTestDatabase().appUrl });
    userId = await findOrCreateUser(app.db, `test_${crypto.randomUUID()}`);
    otherUserId = await findOrCreateUser(app.db, `test_${crypto.randomUUID()}`);
    accountId = await accountOf(userId, "8901");
    const otherAccountId = await accountOf(otherUserId, "8901");
    await withUserContext(app.db, userId, async (ctx) => {
      await saveStatement(ctx, {
        accountId,
        balance: VERIFIED,
        statement: await preparedQuarterly([
          { date: "2026-07-03", amount: -60_000, description: KEY_PAYMENT },
        ]),
      });
      await saveStatement(ctx, {
        accountId,
        balance: UNCHECKED,
        statement: await preparedExport([
          { date: "2026-07-10", amount: -7_000, description: COVERED },
          {
            date: "2026-10-02",
            amount: -50_000,
            description: NEQUI_SEND,
            phone: "3001234567",
          },
        ]),
      });
      await saveStatement(ctx, {
        accountId,
        balance: UNVERIFIED,
        statement: await preparedQuarterly(
          [{ date: "2026-11-09", amount: -9_000, description: UNRECONCILED }],
          { from: "2026-09-30", to: "2026-12-31" },
        ),
      });
    });
    await withUserContext(app.db, otherUserId, async (ctx) =>
      saveStatement(ctx, {
        accountId: otherAccountId,
        balance: VERIFIED,
        statement: await preparedQuarterly([
          { date: "2026-07-03", amount: -1_000, description: OTHERS },
        ]),
      }),
    );
  });

  afterAll(async () => {
    await app.pool.end();
  });

  it("exports every movement the user has, oldest first, saying which count", async () => {
    const rows = await exportOf(userId);

    expect(
      rows.map(({ descriptionRaw, counts }) => [descriptionRaw, counts]),
    ).toEqual([
      [KEY_PAYMENT, true],
      [COVERED, false],
      [NEQUI_SEND, true],
      [UNRECONCILED, false],
    ]);
    expect(rows[0]).toEqual({
      date: "2026-07-03",
      bankId: "bancolombia",
      accountType: "savings",
      accountLast4: "8901",
      descriptionRaw: KEY_PAYMENT,
      amountMinor: -60_000,
      balanceAfterMinor: 40_000,
      categoryId: "transfers_to_people",
      isPendingReview: true,
      referenceLast4: null,
      counts: true,
    });
  });

  it("keeps a reference's last 4 digits only, never its number or hash", async () => {
    const rows = await exportOf(userId);

    expect(rows.find((row) => row.descriptionRaw === NEQUI_SEND)).toMatchObject(
      { referenceLast4: "4567" },
    );
    expect(JSON.stringify(rows)).not.toContain("3001234567");
    expect(Object.keys(rows[0] ?? {})).not.toContain("referenceHash");
  });

  it("never exports another user's movements", async () => {
    expect(textsOf(await exportOf(userId))).not.toContain(OTHERS);
    expect(textsOf(await exportOf(otherUserId))).toEqual([OTHERS]);
  });

  it("exports an account's period as the movements list shows it", async () => {
    const countedIn = {
      accountId,
      period: { from: "2026-07-01", to: "2026-12-31" } as Period,
    };

    expect(textsOf(await exportOf(userId, { countedIn }))).toEqual([
      KEY_PAYMENT,
      NEQUI_SEND,
    ]);
    expect(
      textsOf(
        await exportOf(userId, {
          countedIn,
          search: { text: "nequi" },
        }),
      ),
    ).toEqual([NEQUI_SEND]);
    expect(
      textsOf(await exportOf(userId, { countedIn, isPendingReview: true })),
    ).toEqual([KEY_PAYMENT, NEQUI_SEND]);
  });
});
