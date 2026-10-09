import "server-only";
import { MIN_IDENTIFIER_HASH_KEY_LENGTH } from "@xtrakto/core";
import { z } from "zod";

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

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .url({ protocol: /^postgres(ql)?$/ })
    .refine(isLocalOrVerified, "a hosted database needs sslmode=verify-full"),
  IDENTIFIER_HASH_KEY: z.string().min(MIN_IDENTIFIER_HASH_KEY_LENGTH),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates the server's environment variables and keeps only those. The
 * error names each invalid variable and why, never its value: it ends up in
 * logs, and the values are secrets.
 */
export const parseServerEnv = (
  source: Readonly<Record<string, string | undefined>>,
): ServerEnv => {
  const result = serverEnvSchema.safeParse(source);
  if (result.success) return result.data;
  const problems = result.error.issues.map(
    (issue) => `- ${issue.path.join(".")}: ${issue.message}`,
  );
  throw new Error(
    `Invalid environment variables. Locally they come from the root .env.local.\n${problems.join("\n")}`,
  );
};

let serverEnv: ServerEnv | undefined;

/**
 * The validated environment, parsed on first use so that `next build` and
 * tests don't need it. src/instrumentation.ts calls it when a server starts.
 */
export const getServerEnv = (): ServerEnv => {
  serverEnv ??= parseServerEnv(process.env);
  return serverEnv;
};
