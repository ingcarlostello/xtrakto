import { createHash, randomInt, randomUUID } from "node:crypto";
import type { AmountMinor, LocalDate } from "@xtrakto/core";
import type { Database } from "../src/client/db-client.types";
import { accounts } from "../src/accounts/account.schemas";
import { ingestionJobs } from "../src/ingestion-jobs/ingestion-job.schemas";
import { statements } from "../src/statements/statement.schemas";
import { transactions } from "../src/transactions/transaction.schemas";
import { toUserId } from "../src/user-context/user-context.helpers";
import type { UserId } from "../src/user-context/user-context.types";
import { users } from "../src/users/user.schemas";

// Rows for integration tests. Each test creates its own users, so test files
// can run in parallel against the same database.

export const sha256Hex = (seed: string = randomUUID()): string =>
  createHash("sha256").update(seed).digest("hex");

// Literals that are valid by construction; the brands come from parsing.
export const asLocalDate = (value: string) => value as LocalDate;
export const asAmount = (value: number) => value as AmountMinor;

export const insertUser = async (db: Database): Promise<string> => {
  const [row] = await db
    .insert(users)
    .values({ clerkUserId: `test_${randomUUID()}` })
    .returning({ id: users.id });
  if (!row) throw new Error("No user inserted.");
  return row.id;
};

export const insertAccount = async (
  db: Database,
  userId: string,
): Promise<string> => {
  const [row] = await db
    .insert(accounts)
    .values({
      userId,
      bankId: "bancolombia",
      accountType: "savings",
      // Random, so one user can have several accounts.
      last4: String(randomInt(10_000)).padStart(4, "0"),
      currency: "COP",
    })
    .returning({ id: accounts.id });
  if (!row) throw new Error("No account inserted.");
  return row.id;
};

export type Owner = { readonly userId: string; readonly accountId: string };

export const statementRow = (owner: Owner) => ({
  ...owner,
  formatId: "bancolombia-savings-quarterly",
  periodFrom: asLocalDate("2026-06-30"),
  periodTo: asLocalDate("2026-09-30"),
  balanceVerified: true,
  contentHash: sha256Hex(),
});

export const insertStatement = async (
  db: Database,
  owner: Owner,
): Promise<string> => {
  const [row] = await db
    .insert(statements)
    .values(statementRow(owner))
    .returning({ id: statements.id });
  if (!row) throw new Error("No statement inserted.");
  return row.id;
};

export const transactionRow = (owner: Owner, statementId: string) => ({
  ...owner,
  statementId,
  date: asLocalDate("2026-07-01"),
  descriptionRaw: "TRANSFERENCIAS A NEQUI",
  descriptionNormalized: "TRANSFERENCIAS A NEQUI",
  amountMinor: asAmount(-5_000_000),
  fingerprint: sha256Hex(),
  occurrenceIndex: 0,
  position: 0,
});

export type TransactionRow = ReturnType<typeof transactionRow>;
export const insertTransaction = (db: Database, row: TransactionRow) =>
  db.insert(transactions).values(row);

export type SeededUser = {
  readonly userId: UserId;
  readonly accountId: string;
  readonly statementId: string;
  readonly transactionId: string;
};

/** A user with one row in each table, written as the owner (no RLS). */
export const seedUser = async (db: Database): Promise<SeededUser> => {
  const userId = toUserId(await insertUser(db));
  const accountId = await insertAccount(db, userId);
  const statementId = await insertStatement(db, { userId, accountId });
  const [movement] = await db
    .insert(transactions)
    .values(transactionRow({ userId, accountId }, statementId))
    .returning({ id: transactions.id });
  if (!movement) throw new Error("No transaction inserted.");
  await db.insert(ingestionJobs).values({ userId, accountId });
  return { userId, accountId, statementId, transactionId: movement.id };
};

/** The PostgreSQL error code of a failed query (Drizzle wraps the driver's error). */
export const pgErrorCode = async (query: Promise<unknown>): Promise<string> => {
  try {
    await query;
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined;
    const source: unknown = cause ?? error;
    return typeof source === "object" && source !== null && "code" in source
      ? String(source.code)
      : "none";
  }
  throw new Error("Expected the query to fail.");
};
