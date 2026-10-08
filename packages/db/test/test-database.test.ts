import { describe, expect, it } from "vitest";
import { readTestDatabase } from "./test-database";

const APP_URL = "postgresql://app:secret@127.0.0.1:5432/xtrakto_test";
const OWNER_URL = "postgresql://owner:secret@localhost:5432/xtrakto_test";

const errorMessage = (read: () => unknown): string => {
  try {
    read();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("Expected an error.");
};

describe("readTestDatabase", () => {
  it("skips the database tests when neither URL is set", () => {
    expect(readTestDatabase({})).toBeUndefined();
  });

  it("refuses to skip them in CI", () => {
    expect(() => readTestDatabase({ CI: "true" })).toThrow(/CI must set/);
  });

  it("returns both URLs when they point to local test databases", () => {
    expect(
      readTestDatabase({
        TEST_DATABASE_URL: APP_URL,
        TEST_DATABASE_MIGRATION_URL: OWNER_URL,
      }),
    ).toEqual({ appUrl: APP_URL, ownerUrl: OWNER_URL });
  });

  it.each([
    ["TEST_DATABASE_URL", { TEST_DATABASE_URL: APP_URL }],
    ["TEST_DATABASE_MIGRATION_URL", { TEST_DATABASE_MIGRATION_URL: OWNER_URL }],
  ])("requires both URLs, not only %s", (_, env) => {
    expect(() => readTestDatabase(env)).toThrow(/both/);
  });

  it.each([
    [
      "a hosted database",
      "postgresql://app:secret@ep-example-pooler.us-east-1.aws.neon.tech/xtrakto_test",
    ],
    [
      "the development database",
      "postgresql://app:secret@127.0.0.1:5432/xtrakto",
    ],
  ])("refuses %s", (_, url) => {
    expect(() =>
      readTestDatabase({
        TEST_DATABASE_URL: url,
        TEST_DATABASE_MIGRATION_URL: OWNER_URL,
      }),
    ).toThrow(/only run on a local database/);
  });

  it("rejects a value that isn't a URL", () => {
    expect(() =>
      readTestDatabase({
        TEST_DATABASE_URL: APP_URL,
        TEST_DATABASE_MIGRATION_URL: "not a url",
      }),
    ).toThrow("TEST_DATABASE_MIGRATION_URL is not a valid URL.");
  });

  it("names the host and database in its errors, never the password", () => {
    const message = errorMessage(() =>
      readTestDatabase({
        TEST_DATABASE_URL: "postgresql://app:hunter2@db.example.com/xtrakto",
        TEST_DATABASE_MIGRATION_URL: OWNER_URL,
      }),
    );
    expect(message).toContain("db.example.com/xtrakto");
    expect(message).not.toContain("hunter2");
  });
});
