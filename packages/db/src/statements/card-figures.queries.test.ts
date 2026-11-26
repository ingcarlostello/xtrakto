import { type CategorizedStatement, periodSchema } from "@xtrakto/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  type CardMovement,
  preparedCard,
  preparedQuarterly,
  UNVERIFIED,
  VERIFIED,
} from "../../test/prepared-statements";
import { requireTestDatabase, testDatabase } from "../../test/test-database";
import { insertUser } from "../../test/test-rows";
import { resolveIdentifiedAccount } from "../accounts/account.queries";
import { createDb } from "../client/db-client.queries";
import type { DbClient } from "../client/db-client.types";
import { toUserId } from "../user-context/user-context.helpers";
import { withUserContext } from "../user-context/user-context.queries";
import type { UserId } from "../user-context/user-context.types";
import { listCardFigures, listCardPeriods } from "./card-figures.queries";
import { saveStatement } from "./statement.queries";
import type { BalanceCheck } from "./statement.types";

// Nu's September, 12 August to 10 September, then October.
const SEPTEMBER: CardMovement[] = [
  { date: "2026-08-20", amount: -40_000, description: "Almacen Ropa" },
];
const OCTOBER: CardMovement[] = [
  { date: "2026-09-25", amount: -9_000, description: "Restaurante El Patio" },
];
const OCTOBER_PERIOD = { from: "2026-09-11", to: "2026-10-10" };
const SEPTEMBER_DAYS = { from: "2026-08-12", to: "2026-09-10" };
const period = (from: string, to: string) => periodSchema.parse({ from, to });

type Account = { readonly userId: UserId; readonly accountId: string };

describe.skipIf(!testDatabase)("a card's periods and figures", () => {
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

  const accountOf = (userId: UserId, accountType: "credit_card" | "savings") =>
    withUserContext(app.db, userId, (ctx) =>
      resolveIdentifiedAccount(ctx, {
        bankId: accountType === "credit_card" ? "nu" : "bancolombia",
        accountType,
        last4: accountType === "credit_card" ? "5678" : "8901",
        currency: "COP",
      }),
    );

  // A person with a Nu card and a savings account.
  const newPerson = async () => {
    const userId = toUserId(await insertUser(owner.db));
    return {
      card: { userId, accountId: await accountOf(userId, "credit_card") },
      savings: { userId, accountId: await accountOf(userId, "savings") },
    };
  };

  const save = async (
    { userId, accountId }: Account,
    statement: CategorizedStatement,
    balance: BalanceCheck,
  ) => {
    const saved = await withUserContext(app.db, userId, (ctx) =>
      saveStatement(ctx, { accountId, statement, balance }),
    );
    if (!saved.ok) throw new Error("Expected a save.");
  };

  // September reconciles, with its minimum; October doesn't. Saved the
  // other way round, so the order comes from their periods.
  const withTwoMonths = async () => {
    const person = await newPerson();
    await save(
      person.card,
      await preparedCard(OCTOBER, { ...OCTOBER_PERIOD, minimumMinor: 900_000 }),
      UNVERIFIED,
    );
    await save(person.card, await preparedCard(SEPTEMBER), VERIFIED);
    await save(person.savings, await preparedQuarterly([]), VERIFIED);
    return person;
  };

  it("lists a card's statements by their periods, the oldest first, whether they reconcile or not", async () => {
    const { card, savings } = await withTwoMonths();
    const periodsOf = ({ userId, accountId }: Account) =>
      withUserContext(app.db, userId, (ctx) => listCardPeriods(ctx, accountId));

    expect(await periodsOf(card)).toEqual([
      { period: SEPTEMBER_DAYS, isVerified: true },
      { period: OCTOBER_PERIOD, isVerified: false },
    ]);
    expect(await periodsOf(savings)).toEqual([]);
    const stranger = await newPerson();
    expect(
      await periodsOf({ ...stranger.card, accountId: card.accountId }),
    ).toEqual([]);
  });

  it("reads the figures of the statements that close on the period's days, as core reads them back", async () => {
    const { card, savings } = await withTwoMonths();
    const figuresOf = (
      { userId, accountId }: Account,
      days = period(SEPTEMBER_DAYS.from, SEPTEMBER_DAYS.to),
    ) =>
      withUserContext(app.db, userId, (ctx) =>
        listCardFigures(ctx, { accountId, period: days }),
      );

    const [september, ...others] = await figuresOf(card);

    expect(others).toEqual([]);
    expect(september).toMatchObject({
      period: SEPTEMBER_DAYS,
      isVerified: true,
      differenceMinor: 0,
      card: {
        creditLimitMinor: 500_000_000,
        availableMinor: 400_000_000,
        minimumPaymentMinor: 1_200_000,
        totalPaymentMinor: 7_000_000,
        dueDate: "2026-10-04",
        installments: [],
      },
    });
    // A quarter's days hold both, and October says it doesn't reconcile.
    const quarter = await figuresOf(card, period("2026-08-12", "2026-10-10"));
    expect(
      quarter.map(({ period, isVerified, differenceMinor, card: figures }) => ({
        period,
        isVerified,
        differenceMinor,
        minimum: figures.minimumPaymentMinor,
      })),
    ).toEqual([
      {
        period: SEPTEMBER_DAYS,
        isVerified: true,
        differenceMinor: 0,
        minimum: 1_200_000,
      },
      {
        period: OCTOBER_PERIOD,
        isVerified: false,
        differenceMinor: -1_000,
        minimum: 900_000,
      },
    ]);
    // Its first day isn't its closing day: a period that ends before it
    // closes reads nothing of it.
    expect(await figuresOf(card, period("2026-08-01", "2026-09-09"))).toEqual(
      [],
    );
    expect(await figuresOf(savings)).toEqual([]);
  });
});
