import "server-only";
import { MIN_IDENTIFIER_HASH_KEY_LENGTH } from "@xtrakto/core";
import { z } from "zod";
import { isWaitlistOnly } from "./site";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

// A hosted database (Neon) must prove its identity: without `verify-full`,
// node-postgres would accept any certificate. An unparsable URL passes here
// because `z.url()` already reports it; `new URL` would throw an error that
// carries the URL, password included.
const isLocalOrVerified = (value: string): boolean => {
  if (!URL.canParse(value)) return true;
  const url = new URL(value);
  return (
    LOCAL_HOSTS.has(url.hostname) ||
    url.searchParams.get("sslmode") === "verify-full"
  );
};

// The local Inngest Dev Server: `1`, or its URL on this machine.
const INNGEST_DEV_PATTERN =
  /^(1|http:\/\/(127\.0\.0\.1|localhost|\[::1\]):\d+\/?)$/;

// Empty counts as unset, as .env.example ships these variables.
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );

const serverEnvShape = z.object({
  DATABASE_URL: z
    .url({ protocol: /^postgres(ql)?$/ })
    .refine(isLocalOrVerified, "a hosted database needs sslmode=verify-full"),
  IDENTIFIER_HASH_KEY: z.string().min(MIN_IDENTIFIER_HASH_KEY_LENGTH),
  // Clerk reads both itself; checking them here stops the server early. The
  // prefixes also catch the secret key pasted in the public variable, which
  // would ship it to every browser.
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .regex(/^pk_(test|live)_/, "must start with pk_test_ or pk_live_"),
  CLERK_SECRET_KEY: z
    .string()
    .regex(/^sk_(test|live)_/, "must start with sk_test_ or sk_live_"),
  // Signs Clerk's user.deleted webhook. Optional in development, where Clerk
  // can't reach localhost; production needs it, or deletions made in Clerk
  // would leave data behind.
  CLERK_WEBHOOK_SIGNING_SECRET: optional(
    z.string().regex(/^whsec_/, "must start with whsec_"),
  ),
  // Inngest's SDK reads these itself, as Clerk does. Version 4 defaults to
  // Cloud mode, which needs both keys; INNGEST_DEV points it at the local Dev
  // Server instead, which needs none.
  INNGEST_DEV: optional(
    z
      .string()
      .regex(INNGEST_DEV_PATTERN, "must be 1 or the local Dev Server's URL"),
  ),
  INNGEST_SIGNING_KEY: optional(
    z.string().regex(/^signkey-/, "must start with signkey-"),
  ),
  INNGEST_EVENT_KEY: optional(z.string()),
  // Where Sentry's events go (lib/sentry.ts, which reads it, inlined, in the
  // browser too). Unset locally and in CI, where Sentry stays off; a malformed
  // one stops the server rather than turning error monitoring off unnoticed.
  NEXT_PUBLIC_SENTRY_DSN: optional(z.url({ protocol: /^https$/ })),
  // PostHog's project key (lib/analytics.ts reads it, inlined, in the
  // browser). Unset locally and in CI, where analytics stays off. The prefix
  // catches a personal API key, a secret, pasted in this public variable.
  NEXT_PUBLIC_POSTHOG_KEY: optional(
    z.string().regex(/^phc_/, "must start with phc_"),
  ),
  // Set by Next.js: production for `next build`, `next start` and Vercel.
  NODE_ENV: z.string().optional(),
  // Set by Vercel on every deployment, previews included.
  VERCEL: optional(z.string()),
});

type ServerEnvShape = z.infer<typeof serverEnvShape>;
type EnvIssue = {
  readonly path: keyof ServerEnvShape;
  readonly message: string;
};

const productionIssues = (env: ServerEnvShape): EnvIssue[] =>
  env.NODE_ENV === "production" && !env.CLERK_WEBHOOK_SIGNING_SECRET
    ? [
        {
          path: "CLERK_WEBHOOK_SIGNING_SECRET",
          message: "required in production",
        },
      ]
    : [];

// Keyed on VERCEL rather than NODE_ENV, so that a local `next start` still
// uses the Dev Server.
const inngestIssues = (env: ServerEnvShape): EnvIssue[] => {
  if (env.INNGEST_DEV)
    return env.VERCEL
      ? [
          {
            path: "INNGEST_DEV",
            message:
              "must not be set on Vercel: dev mode skips Inngest's signature check",
          },
        ]
      : [];
  return (["INNGEST_SIGNING_KEY", "INNGEST_EVENT_KEY"] as const)
    .filter((name) => !env[name])
    .map((path) => ({
      path,
      message: "required unless INNGEST_DEV points to the local Dev Server",
    }));
};

const serverEnvSchema = serverEnvShape.superRefine((env, context) => {
  for (const { path, message } of [
    ...productionIssues(env),
    ...inngestIssues(env),
  ])
    context.addIssue({ code: "custom", path: [path], message });
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

// A waitlist-only deployment (16.0d, ADR 0022) reaches the database and
// nothing else: no Clerk, no Inngest, no hashes.
const waitlistEnvSchema = serverEnvShape.pick({ DATABASE_URL: true });

export type WaitlistEnv = z.infer<typeof waitlistEnvSchema>;

type EnvSource = Readonly<Record<string, string | undefined>>;

// The error names each invalid variable and why, never its value: it ends up
// in logs, and the values are secrets.
const parseWith = <T>(schema: z.ZodType<T>, source: EnvSource): T => {
  const result = schema.safeParse(source);
  if (result.success) return result.data;
  const problems = result.error.issues.map(
    (issue) => `- ${issue.path.join(".")}: ${issue.message}`,
  );
  throw new Error(
    `Invalid environment variables. Locally they come from the root .env.local.\n${problems.join("\n")}`,
  );
};

/** Validates the server's environment variables and keeps only those. */
export const parseServerEnv = (source: EnvSource): ServerEnv =>
  parseWith(serverEnvSchema, source);

/** The same for a waitlist-only deployment: the database URL alone. */
export const parseWaitlistEnv = (source: EnvSource): WaitlistEnv =>
  parseWith(waitlistEnvSchema, source);

/** `next dev` sets NODE_ENV to development; Next.js inlines it at compile time. */
// Set by Next.js per command, not by the deployment, so turbo.json doesn't list it.
// eslint-disable-next-line turbo/no-undeclared-env-vars
export const isDevelopment = process.env.NODE_ENV === "development";

let serverEnv: ServerEnv | undefined;

/**
 * The validated environment, parsed on first use so that `next build` and
 * tests don't need it. src/instrumentation.ts checks it when a server starts.
 */
export const getServerEnv = (): ServerEnv => {
  serverEnv ??= parseServerEnv(process.env);
  return serverEnv;
};

/**
 * The application role's database URL. A waitlist-only deployment validates
 * only that; anything else asking for the whole environment there fails.
 */
export const getDatabaseUrl = (): string =>
  isWaitlistOnly()
    ? parseWaitlistEnv(process.env).DATABASE_URL
    : getServerEnv().DATABASE_URL;

/** Checks, when a server starts, the variables its deployment needs. */
export const checkServerEnv = (): void => {
  void getDatabaseUrl();
};
