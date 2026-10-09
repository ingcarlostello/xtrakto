import type { DbTransaction } from "../client/db-client.types";

declare const userIdBrand: unique symbol;

/** An internal user id: a UUID from the `users` table, never a Clerk id. */
export type UserId = string & { readonly [userIdBrand]: true };

/** Inside `withUserContext`: queries on `tx` see and write only `userId`'s rows. */
export type UserContext = {
  readonly tx: DbTransaction;
  readonly userId: UserId;
};
