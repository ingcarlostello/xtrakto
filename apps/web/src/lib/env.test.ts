import { describe, expect, it } from "vitest";
import { parseServerEnv, parseWaitlistEnv } from "./env";

// Invented values. The passwords and keys are marked so that a test can prove
// they never reach the error message, which ends up in logs. The keys are put
// together at runtime from readable text: a whole "whsec_…" literal looks real
// to secret scanners, and GitHub flagged one as a Stripe webhook secret.
const fakeKey = (prefix: string, body: string) => `${prefix}_${body}`;
const base64 = (text: string) => Buffer.from(text).toString("base64");
const HASH_KEY = "secret-hash-key-0123456789abcdef0123456789";
const LOCAL_URL = "postgresql://xtrakto_app:secret-pw@127.0.0.1:5432/xtrakto";
const HOSTED_URL =
  "postgresql://xtrakto_app:secret-pw@ep-example-pooler.us-east-1.aws.neon.tech/neondb";
const PUBLISHABLE_KEY = fakeKey(
  "pk_test",
  base64("example.clerk.accounts.dev$"),
);
const SECRET_KEY = fakeKey("sk_test", "secretClerkKey0123456789abcdef");
const WEBHOOK_SECRET = fakeKey("whsec", base64("secretWebhookKey0123456789"));
const SIGNING_KEY = ["signkey", "prod", "secretSigningKey0123456789"].join("-");
const EVENT_KEY = "secret-event-key-0123456789";
const DEV_SERVER = "http://127.0.0.1:8288";
const SENTRY_DSN = "https://publickey@o1.ingest.us.sentry.io/2";
const REQUIRED = {
  DATABASE_URL: LOCAL_URL,
  IDENTIFIER_HASH_KEY: HASH_KEY,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: SECRET_KEY,
};
const VALID = { ...REQUIRED, INNGEST_DEV: DEV_SERVER };
const CLOUD_KEYS = {
  INNGEST_SIGNING_KEY: SIGNING_KEY,
  INNGEST_EVENT_KEY: EVENT_KEY,
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

    for (const name of Object.keys(REQUIRED)) expect(message).toContain(name);
  });

  it("requires both Inngest keys unless INNGEST_DEV points to the Dev Server", () => {
    const message = failureOf({ ...REQUIRED, INNGEST_DEV: "" });

    expect(message).toContain("INNGEST_SIGNING_KEY");
    expect(message).toContain("INNGEST_EVENT_KEY");
  });

  it("accepts Cloud mode with both keys, without the Dev Server", () => {
    expect(parseServerEnv({ ...REQUIRED, ...CLOUD_KEYS })).toEqual({
      ...REQUIRED,
      ...CLOUD_KEYS,
    });
  });

  it("refuses INNGEST_DEV on Vercel, where dev mode would skip the signature check", () => {
    const message = failureOf({ ...VALID, ...CLOUD_KEYS, VERCEL: "1" });

    expect(message).toContain("INNGEST_DEV");
    expect(message).not.toContain("secret");
  });

  it("lets a local production server (next start) use the Dev Server", () => {
    const env = parseServerEnv({
      ...VALID,
      NODE_ENV: "production",
      CLERK_WEBHOOK_SIGNING_SECRET: WEBHOOK_SECRET,
    });

    expect(env.INNGEST_DEV).toBe(DEV_SERVER);
  });

  it.each(["1", DEV_SERVER, "http://localhost:8288/", "http://[::1]:8288"])(
    "accepts INNGEST_DEV=%s",
    (value) => {
      expect(parseServerEnv({ ...VALID, INNGEST_DEV: value }).INNGEST_DEV).toBe(
        value,
      );
    },
  );

  it.each(["0", "true", "https://inn.gs", "http://192.168.1.20:8288"])(
    "rejects INNGEST_DEV=%s, which isn't the local Dev Server",
    (value) => {
      expect(failureOf({ ...VALID, INNGEST_DEV: value })).toContain(
        "INNGEST_DEV",
      );
    },
  );

  it("rejects an Inngest signing key without its prefix without printing it", () => {
    const message = failureOf({
      ...REQUIRED,
      ...CLOUD_KEYS,
      INNGEST_SIGNING_KEY: "secretSigningKey0123456789",
    });

    expect(message).toContain("INNGEST_SIGNING_KEY");
    expect(message).not.toContain("secret");
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

  it.each([undefined, ""])(
    "leaves Sentry off without a DSN (%j), as locally and in CI",
    (dsn) => {
      expect(
        parseServerEnv({ ...VALID, NEXT_PUBLIC_SENTRY_DSN: dsn })
          .NEXT_PUBLIC_SENTRY_DSN,
      ).toBeUndefined();
    },
  );

  it("accepts Sentry's DSN", () => {
    expect(
      parseServerEnv({ ...VALID, NEXT_PUBLIC_SENTRY_DSN: SENTRY_DSN })
        .NEXT_PUBLIC_SENTRY_DSN,
    ).toBe(SENTRY_DSN);
  });

  it.each(["not a url", SENTRY_DSN.replace("https:", "http:")])(
    "refuses the DSN %j, which would turn error monitoring off unnoticed",
    (dsn) => {
      expect(failureOf({ ...VALID, NEXT_PUBLIC_SENTRY_DSN: dsn })).toContain(
        "NEXT_PUBLIC_SENTRY_DSN",
      );
    },
  );
});

describe("parseWaitlistEnv", () => {
  const VERIFIED_URL = `${HOSTED_URL}?sslmode=verify-full`;

  it("needs only the database URL, without Clerk, Inngest or the hash key", () => {
    expect(
      parseWaitlistEnv({
        DATABASE_URL: VERIFIED_URL,
        NODE_ENV: "production",
        VERCEL: "1",
      }),
    ).toEqual({ DATABASE_URL: VERIFIED_URL });
  });

  it("still refuses a hosted database without verify-full, without printing it", () => {
    let message = "";
    try {
      parseWaitlistEnv({ DATABASE_URL: `${HOSTED_URL}?sslmode=require` });
    } catch (error) {
      message = error instanceof Error ? error.message : "";
    }

    expect(message).toContain("DATABASE_URL");
    expect(message).not.toContain("secret");
  });

  it("refuses a deployment without a database URL", () => {
    expect(() => parseWaitlistEnv({})).toThrow(/DATABASE_URL/);
  });
});
