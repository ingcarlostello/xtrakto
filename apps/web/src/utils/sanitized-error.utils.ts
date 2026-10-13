// What may name a failure without quoting any data: an error's class, and a
// code or constraint written the way PostgreSQL and Node write them
// (`23514`, `ECONNREFUSED`, `ingestion_jobs_status_check`).
const CLASS_NAME = /^[A-Za-z]{1,64}$/;
const CODE = /^[0-9A-Z_]{1,40}$/;
const CONSTRAINT = /^[a-z0-9_]{1,63}$/;

const classOf = (error: unknown): string | undefined => {
  if (!(error instanceof Error)) return undefined;
  const { name } = error.constructor;
  return CLASS_NAME.test(name) ? name : undefined;
};

const fieldOf = (
  source: unknown,
  key: string,
  pattern: RegExp,
): string | undefined => {
  if (typeof source !== "object" || source === null) return undefined;
  const value: unknown = Reflect.get(source, key);
  return typeof value === "string" && pattern.test(value) ? value : undefined;
};

/**
 * An error safe to log: `label`, the original error's class and, from the
 * error it wraps, a PostgreSQL SQLSTATE or system code and a constraint's
 * name. Never the original message or cause: a Drizzle query error's message
 * lists the query's parameters, which can hold a statement's content.
 */
export const sanitizedError = (label: string, error: unknown): Error => {
  const source =
    error instanceof Error && error.cause !== undefined ? error.cause : error;
  const parts = [
    classOf(error),
    fieldOf(source, "code", CODE),
    fieldOf(source, "constraint", CONSTRAINT),
  ].filter((part) => part !== undefined);
  return new Error(parts.length > 0 ? `${label}: ${parts.join(" ")}` : label);
};

/** Runs `work`, throwing a `sanitizedError` in place of anything it throws. */
export const withSanitizedErrors = async <T>(
  label: string,
  work: () => Promise<T>,
): Promise<T> => {
  try {
    return await work();
  } catch (error) {
    throw sanitizedError(label, error);
  }
};
