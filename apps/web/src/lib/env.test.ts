import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env";

// Invented values. The passwords and keys are marked so that a test can prove
// they never reach the error message, which ends up in logs.
const HASH_KEY = "secret-hash-key-0123456789abcdef0123456789";
const LOCAL_URL = "postgresql://xtrakto_app:secret-pw@127.0.0.1:5432/xtrakto";
const HOSTED_URL =
  "postgresql://xtrakto_app:secret-pw@ep-example-pooler.us-east-1.aws.neon.tech/neondb";
const PUBLISHABLE_KEY = "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk";
const SECRET_KEY = "sk_test_secretClerkKey0123456789abcdef";
const WEBHOOK_SECRET = "whsec_c2VjcmV0V2ViaG9va0tleTAxMjM0NTY3ODk=";
const VALID = {
  DATABASE_URL: LOCAL_URL,
  IDENTIFIER_HASH_KEY: HASH_KEY,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: SECRET_KEY,
};

const failureOf = (source: Record<string, string | undefined>): string => {
  try {
    parseServerEnv(source);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("Expected the environment to be rejected.");
};

describe("parseServerEnv", () => {
  it("returns the variables it validates and drops the rest", () => {
    expect(parseServerEnv({ ...VALID, PATH: "/usr/bin" })).toEqual(VALID);
  });

  it.each([
    "postgres://xtrakto_app:secret-pw@localhost/xtrakto",
    "postgresql://xtrakto_app:secret-pw@[::1]:5432/xtrakto",
    `${HOSTED_URL}?sslmode=verify-full`,
  ])("accepts the database URL %s", (url) => {
    expect(parseServerEnv({ ...VALID, DATABASE_URL: url }).DATABASE_URL).toBe(
      url,
    );
  });

  it("names every missing variable at once", () => {
    const message = failureOf({});

    for (const name of Object.keys(VALID)) expect(message).toContain(name);
  });

  it("rejects the secret key in the public variable, which would reach the browser", () => {
    const message = failureOf({
      ...VALID,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: SECRET_KEY,
    });

    expect(message).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    expect(message).not.toContain("secret");
  });

  it.each([undefined, ""])(
    "accepts a missing webhook secret (%j) in development",
    (secret) => {
      const env = parseServerEnv({
        ...VALID,
        NODE_ENV: "development",
        CLERK_WEBHOOK_SIGNING_SECRET: secret,
      });

      expect(env.CLERK_WEBHOOK_SIGNING_SECRET).toBeUndefined();
    },
  );

  it("requires the webhook secret in production, or deletions in Clerk would leave data behind", () => {
    expect(failureOf({ ...VALID, NODE_ENV: "production" })).toContain(
      "CLERK_WEBHOOK_SIGNING_SECRET",
    );
    expect(
      parseServerEnv({
        ...VALID,
        NODE_ENV: "production",
        CLERK_WEBHOOK_SIGNING_SECRET: WEBHOOK_SECRET,
      }).CLERK_WEBHOOK_SIGNING_SECRET,
    ).toBe(WEBHOOK_SECRET);
  });

  it("rejects a webhook secret without its prefix without printing it", () => {
    const message = failureOf({
      ...VALID,
      CLERK_WEBHOOK_SIGNING_SECRET: "secretWebhookKey0123456789",
    });

    expect(message).toContain("CLERK_WEBHOOK_SIGNING_SECRET");
    expect(message).not.toContain("secret");
  });

  it("rejects a Clerk secret key without its prefix without printing it", () => {
    const message = failureOf({
      ...VALID,
      CLERK_SECRET_KEY: "secretClerkKey0123456789abcdef",
    });

    expect(message).toContain("CLERK_SECRET_KEY");
    expect(message).not.toContain("secret");
  });

  it("rejects the empty hash key that .env.example ships with", () => {
    expect(failureOf({ ...VALID, IDENTIFIER_HASH_KEY: "" })).toContain(
      "IDENTIFIER_HASH_KEY",
    );
  });

  it("rejects a hash key shorter than 32 characters without printing it", () => {
    const shortKey = "secret-hash-key-0123456789abcde";
    const message = failureOf({ ...VALID, IDENTIFIER_HASH_KEY: shortKey });

    expect(message).toContain("IDENTIFIER_HASH_KEY");
    expect(message).not.toContain("secret");
  });

  it.each([
    {
      case: "another database",
      url: "mysql://root:secret-pw@127.0.0.1/xtrakto",
    },
    { case: "an unparsable URL", url: "postgresql://xtrakto_app:secret-pw@" },
    { case: "a hosted database without TLS options", url: HOSTED_URL },
    {
      case: "a hosted database that skips verification",
      url: `${HOSTED_URL}?sslmode=require`,
    },
  ])("rejects $case without printing the URL", ({ url }) => {
    const message = failureOf({ ...VALID, DATABASE_URL: url });

    expect(message).toContain("DATABASE_URL");
    expect(message).not.toContain("secret");
  });
});
