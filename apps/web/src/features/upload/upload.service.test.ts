import { APP_ERROR_CODE, err, ok } from "@xtrakto/core";
import type { ExtractedContent, SpreadsheetCell } from "@xtrakto/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONTENT_TOO_LARGE } from "./upload.constants";
import {
  getMonthlyUsage,
  listUploadAccounts,
  listUploadJobs,
  queueStatement,
} from "./upload.service";

// Row-Level Security, the queries, the limit's lock and the parsers are
// tested in their packages; here, what the service sends where. The parsers
// run for real.
const mocks = vi.hoisted(() => ({
  findUserId: vi.fn(),
  findOrCreateUser: vi.fn(),
  listAccounts: vi.fn(),
  countSlotsUsed: vi.fn(),
  createIngestionJobWithinLimit: vi.fn(),
  deletePendingIngestionJob: vi.fn(),
  listIngestionJobResults: vi.fn(),
  withUserContext: vi.fn(),
  send: vi.fn(),
}));

vi.mock("@xtrakto/db", () => ({
  findUserId: mocks.findUserId,
  findOrCreateUser: mocks.findOrCreateUser,
  listAccounts: mocks.listAccounts,
  countSlotsUsed: mocks.countSlotsUsed,
  createIngestionJobWithinLimit: mocks.createIngestionJobWithinLimit,
  deletePendingIngestionJob: mocks.deletePendingIngestionJob,
  listIngestionJobResults: mocks.listIngestionJobResults,
  withUserContext: mocks.withUserContext,
}));
vi.mock("@/lib/db", () => ({ getDb: () => "db" }));
vi.mock("@/lib/inngest", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/inngest")>()),
  inngest: { send: mocks.send },
}));

const USER_ID = "0b6f1d2e-58c4-4c31-9a59-6a3f0f5c2e11";
const JOB_ID = "7d1e3c5a-2b4f-4e6a-8c9d-0e1f2a3b4c5d";
const CONTEXT = { tx: "tx", userId: USER_ID };
const account = (id: string) => ({
  id,
  bankId: "bancolombia",
  accountType: "savings",
  last4: null,
});

const HEADER: SpreadsheetCell[] = [
  "Fecha",
  "Descripción",
  "Referencia",
  "Valor",
];
// October 1, 2026 in Bogotá, as the bank's export stores it.
const OCTOBER_1 = { excelSerial: 46296.208333333336 };
const exportOf = (name: string, row: SpreadsheetCell[]): ExtractedContent => ({
  type: "spreadsheet",
  sheets: [{ name, rows: [HEADER, row] }],
});
// A movements export as a browser that doesn't minimize would send it.
const SENT = exportOf("Movimientos", [
  OCTOBER_1,
  "INTERES INV VIRT 10000000001",
  null,
  1250.5,
  "nota",
]);
const MINIMIZED = exportOf("", [
  OCTOBER_1,
  "INTERES INV VIRT *******0001",
  null,
  1250.5,
]);
// Its JSON passes the 3.5 MB an upload may carry.
const TOO_LARGE: ExtractedContent = {
  type: "spreadsheet",
  sheets: [
    { name: "", rows: Array.from({ length: 8_000 }, () => ["x".repeat(450)]) },
  ],
};
const BUDGET: ExtractedContent = {
  type: "spreadsheet",
  sheets: [
    {
      name: "Presupuesto",
      rows: [
        ["Mes", "Gastos"],
        ["Enero", 2e6],
      ],
    },
  ],
};

const queue = (account?: { accountId: string } | { accountLast4: string }) =>
  queueStatement("user_clerk", { content: SENT, account });

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-12T15:00:00Z") });
  mocks.withUserContext.mockImplementation(
    (_db: unknown, userId: string, work: (ctx: unknown) => unknown) =>
      work({ tx: "tx", userId }),
  );
  mocks.findOrCreateUser.mockResolvedValue(USER_ID);
  mocks.listAccounts.mockResolvedValue([account("a")]);
  mocks.createIngestionJobWithinLimit.mockResolvedValue(ok(JOB_ID));
  mocks.send.mockResolvedValue({ ids: ["event"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("listUploadAccounts", () => {
  it("reads the accounts in the signed-in user's own context", async () => {
    mocks.findUserId.mockResolvedValue(USER_ID);

    expect(await listUploadAccounts("user_clerk")).toEqual([account("a")]);
    expect(mocks.findUserId).toHaveBeenCalledWith("db", "user_clerk");
    expect(mocks.withUserContext).toHaveBeenCalledWith(
      "db",
      USER_ID,
      mocks.listAccounts,
    );
  });

  it("has no accounts for someone who never sent a file", async () => {
    mocks.findUserId.mockResolvedValue(undefined);

    expect(await listUploadAccounts("user_new")).toEqual([]);
    expect(mocks.withUserContext).not.toHaveBeenCalled();
  });
});

describe("getMonthlyUsage", () => {
  it("counts the slots the user's jobs hold this month in Bogotá", async () => {
    mocks.findUserId.mockResolvedValue(USER_ID);
    mocks.countSlotsUsed.mockResolvedValue(3);

    expect(await getMonthlyUsage("user_clerk")).toEqual({
      used: 3,
      limit: 10,
      resetsOn: "2026-11-01",
    });
    expect(mocks.countSlotsUsed).toHaveBeenCalledWith(CONTEXT, {
      start: new Date("2026-10-01T05:00:00Z"),
      end: new Date("2026-11-01T05:00:00Z"),
    });
  });

  it("counts none for someone who never sent a file, without creating them", async () => {
    mocks.findUserId.mockResolvedValue(undefined);

    expect(await getMonthlyUsage("user_new")).toMatchObject({ used: 0 });
    expect(mocks.withUserContext).not.toHaveBeenCalled();
    expect(mocks.findOrCreateUser).not.toHaveBeenCalled();
  });
});

describe("listUploadJobs", () => {
  const OTHER_JOB = "8e2f4d6b-3c5a-4f7b-9d0e-1f2a3b4c5d6e";
  const period = { from: "2026-06-30", to: "2026-09-30" };

  it("gives the user's jobs in the order asked, with only what the screen shows", async () => {
    mocks.findUserId.mockResolvedValue(USER_ID);
    const statement = {
      period,
      balance: "unverified",
      differenceMinor: -1_000,
    };
    mocks.listIngestionJobResults.mockResolvedValue([
      {
        id: OTHER_JOB,
        status: "done",
        formatId: "f",
        isSlow: false,
        errorCode: null,
        stats: { total: 3, skipped: 3 },
        statement,
      },
      {
        id: JOB_ID,
        status: "failed",
        formatId: null,
        isSlow: false,
        errorCode: "PARSE_FAILED",
        stats: {},
        statement: null,
      },
    ]);

    expect(await listUploadJobs("user_clerk", [JOB_ID, OTHER_JOB])).toEqual([
      {
        jobId: JOB_ID,
        status: "failed",
        isSlow: false,
        errorCode: "PARSE_FAILED",
      },
      {
        jobId: OTHER_JOB,
        status: "done",
        isSlow: false,
        formatId: "f",
        outcome: {
          stats: {
            total: 3,
            added: 0,
            skipped: 3,
            covered: 0,
            hidden: 0,
            replaced: 0,
          },
          ...statement,
        },
      },
    ]);
    expect(mocks.listIngestionJobResults).toHaveBeenCalledWith(
      { tx: "tx", userId: USER_ID },
      [JOB_ID, OTHER_JOB],
    );
  });

  it("reads nothing for no jobs, or for someone who never sent a file", async () => {
    mocks.findUserId.mockResolvedValue(undefined);

    expect(await listUploadJobs("user_clerk", [])).toEqual([]);
    expect(await listUploadJobs("user_new", [JOB_ID])).toEqual([]);
    expect(mocks.withUserContext).not.toHaveBeenCalled();
  });
});

describe("queueStatement", () => {
  it("queues the content minimized again, in the user's only account, for this month", async () => {
    expect(await queue()).toEqual(ok({ jobId: JOB_ID }));
    expect(mocks.findOrCreateUser).toHaveBeenCalledWith("db", "user_clerk");
    expect(mocks.createIngestionJobWithinLimit).toHaveBeenCalledWith(
      CONTEXT,
      {
        formatId: "bancolombia-movements-export",
        extractedContent: MINIMIZED,
        accountId: "a",
      },
      {
        limit: 10,
        month: {
          start: new Date("2026-10-01T05:00:00Z"),
          end: new Date("2026-11-01T05:00:00Z"),
        },
      },
    );
  });

  it("announces the job with its id and the user's, nothing else, once it exists", async () => {
    await queue();

    const [event] = mocks.send.mock.calls[0] ?? [];
    expect(event).toMatchObject({
      name: "statement/submitted",
      id: `statement-submitted-${JOB_ID}`,
    });
    expect(event.data).toEqual({ jobId: JOB_ID, userId: USER_ID });
    expect(
      mocks.createIngestionJobWithinLimit.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.send.mock.invocationCallOrder[0] ?? 0);
  });

  it("pins the account chosen on the upload screen", async () => {
    await queue({ accountLast4: "2109" });

    expect(mocks.createIngestionJobWithinLimit).toHaveBeenCalledWith(
      CONTEXT,
      expect.objectContaining({ accountLast4: "2109" }),
      expect.anything(),
    );
  });

  it.each([
    ["content too large to send", TOO_LARGE, err(CONTENT_TOO_LARGE)],
    [
      "content in no known format",
      BUDGET,
      err({ code: APP_ERROR_CODE.UNKNOWN_FORMAT }),
    ],
  ])(
    "refuses %s before touching the database",
    async (_case, content, result) => {
      expect(await queueStatement("user_clerk", { content })).toEqual(result);
      expect(mocks.findOrCreateUser).not.toHaveBeenCalled();
    },
  );

  it("creates nothing when the user has several accounts and chose none", async () => {
    mocks.listAccounts.mockResolvedValue([account("a"), account("b")]);

    expect(await queue()).toEqual(
      err({ code: APP_ERROR_CODE.ACCOUNT_REQUIRED }),
    );
    expect(mocks.createIngestionJobWithinLimit).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("says when the statements renew once the month's limit is reached", async () => {
    mocks.createIngestionJobWithinLimit.mockResolvedValue(err({ used: 10 }));

    expect(await queue()).toEqual(
      err({
        code: APP_ERROR_CODE.LIMIT_REACHED,
        details: { limit: 10, used: 10, resetsOn: "2026-11-01" },
      }),
    );
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("deletes the job, and throws without details, when its event can't be sent", async () => {
    mocks.send.mockRejectedValue(new Error("Failed to send event: 401"));

    await expect(queue()).rejects.toThrow(/^EVENT_NOT_SENT: Error$/);
    expect(mocks.deletePendingIngestionJob).toHaveBeenCalledWith(
      CONTEXT,
      JOB_ID,
    );
  });

  it("throws a database error without the content its message carried", async () => {
    const cause = Object.assign(new Error("violates check constraint"), {
      code: "23514",
    });
    mocks.createIngestionJobWithinLimit.mockRejectedValue(
      new Error("Failed query: insert\nparams: INTERES INV VIRT *******0001", {
        cause,
      }),
    );

    await expect(queue()).rejects.toThrow(/^JOB_NOT_CREATED: Error 23514$/);
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
