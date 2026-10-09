import type { UserId } from "./user-context.types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUserId = (value: unknown): value is UserId =>
  typeof value === "string" && UUID_PATTERN.test(value);

/** For ids read from the `users` table. Anything else is a bug, so it throws. */
export const toUserId = (value: string): UserId => {
  if (!isUserId(value)) throw new TypeError("A user id must be a UUID.");
  return value;
};
