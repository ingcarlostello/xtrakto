import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_VERSION } from "./waitlist.constants";
import { addToWaitlist } from "./waitlist.service";
import type { WaitlistEntryValues } from "./waitlist.types";

// The database side (insert only, a repeated email) is tested in packages/db.
const mocks = vi.hoisted(() => ({ addWaitlistEntry: vi.fn() }));

vi.mock("@xtrakto/db", () => ({ addWaitlistEntry: mocks.addWaitlistEntry }));
vi.mock("@/lib/db", () => ({ getDb: () => "db" }));

const ENTRY: WaitlistEntryValues = {
  name: "Ana Prueba",
  email: "ana@example.com",
  consent: true,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("addToWaitlist", () => {
  it("adds the entry with the version of the consent the page shows", async () => {
    await addToWaitlist(ENTRY);

    expect(mocks.addWaitlistEntry).toHaveBeenCalledWith("db", {
      name: "Ana Prueba",
      email: "ana@example.com",
      consentVersion: CONSENT_VERSION,
    });
  });

  it("throws a database error without the name or the email its message quotes", async () => {
    const violation = Object.assign(new Error("violates check constraint"), {
      code: "23514",
      constraint: "waitlist_entries_email_check",
    });
    mocks.addWaitlistEntry.mockRejectedValue(
      new Error(
        `insert into "waitlist_entries" params: ${ENTRY.name},${ENTRY.email}`,
        {
          cause: violation,
        },
      ),
    );

    const error: unknown = await addToWaitlist(ENTRY).catch((thrown) => thrown);

    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toMatch(
      /^Error: WAITLIST_NOT_JOINED: Error 23514 waitlist_entries_email_check$/,
    );
    expect((error as Error).cause).toBeUndefined(); // Checked just above.
  });
});
