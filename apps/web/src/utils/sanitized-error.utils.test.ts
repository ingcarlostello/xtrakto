import { describe, expect, it } from "vitest";
import { sanitizedError, withSanitizedErrors } from "./sanitized-error.utils";

// Stands in for Drizzle's error, whose message lists the query's parameters.
class DrizzleQueryError extends Error {}

const databaseError = (fields: Record<string, string>) =>
  Object.assign(
    new Error('new row for relation "ingestion_jobs" violates a constraint'),
    fields,
  );

const failedInsert = (cause: Error) =>
  new DrizzleQueryError(
    "Failed query: insert into ingestion_jobs\nparams: TRANSFERENCIAS A NEQUI,3001234567",
    { cause },
  );

describe("sanitizedError", () => {
  it("keeps a query error's class, SQLSTATE and constraint, never its query, values or cause", () => {
    const cause = databaseError({
      code: "23514",
      constraint: "ingestion_jobs_status_check",
      detail: "Failing row contains (3001234567).",
    });

    const sanitized = sanitizedError("JOB_NOT_CREATED", failedInsert(cause));

    expect(sanitized.message).toBe(
      "JOB_NOT_CREATED: DrizzleQueryError 23514 ingestion_jobs_status_check",
    );
    expect(sanitized.cause).toBeUndefined();
  });

  it("names a network failure by its system code", () => {
    const error = new TypeError("fetch failed", {
      cause: Object.assign(new Error("connect 127.0.0.1:8288"), {
        code: "ECONNREFUSED",
      }),
    });

    expect(sanitizedError("EVENT_NOT_SENT", error).message).toBe(
      "EVENT_NOT_SENT: TypeError ECONNREFUSED",
    );
  });

  it("drops a code or constraint that could quote data", () => {
    const cause = databaseError({
      code: "TRANSFERENCIAS A NEQUI",
      constraint: "Pago a Ana 3001234567",
    });

    expect(sanitizedError("JOB_NOT_CREATED", failedInsert(cause)).message).toBe(
      "JOB_NOT_CREATED: DrizzleQueryError",
    );
  });

  it("says only the label for a thrown value that isn't an error", () => {
    expect(sanitizedError("JOB_NOT_CREATED", "3001234567").message).toBe(
      "JOB_NOT_CREATED",
    );
  });
});

describe("withSanitizedErrors", () => {
  it("returns what the work returns", async () => {
    await expect(withSanitizedErrors("LABEL", async () => 42)).resolves.toBe(
      42,
    );
  });

  it("throws the sanitized error in place of the original", async () => {
    const work = () =>
      Promise.reject(failedInsert(databaseError({ code: "23503" })));

    await expect(withSanitizedErrors("JOB_NOT_CREATED", work)).rejects.toThrow(
      /^JOB_NOT_CREATED: DrizzleQueryError 23503$/,
    );
  });
});
