import type { ExtractedContent } from "@xtrakto/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitStatement } from "./submit-statement.action";

const mocks = vi.hoisted(() => ({
  getSignedInClerkUserId: vi.fn(),
  queueStatement: vi.fn(),
  endExample: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSignedInClerkUserId: mocks.getSignedInClerkUserId,
}));
vi.mock("@/lib/example-mode", () => ({ endExample: mocks.endExample }));
vi.mock("../upload.service", () => ({
  queueStatement: mocks.queueStatement,
}));

const ACCOUNT_ID = "3f8a1c2e-1234-4abc-9def-0123456789ab";
const CONTENT: ExtractedContent = {
  type: "spreadsheet",
  sheets: [
    { name: "", rows: [["Fecha", "Descripción", "Referencia", "Valor"]] },
  ],
};
const INVALID_INPUT = { ok: false, error: { code: "INVALID_INPUT" } };

// The action's input type is the browser's promise, not a guarantee.
const submitUntyped = (input: unknown) =>
  submitStatement(input as Parameters<typeof submitStatement>[0]);

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getSignedInClerkUserId.mockResolvedValue("user_clerk");
});

describe("submitStatement", () => {
  it("refuses a signed-out visitor and queues nothing", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue(null);

    await expect(submitStatement({ content: CONTENT })).resolves.toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(mocks.queueStatement).not.toHaveBeenCalled();
  });

  it.each<[string, unknown]>([
    ["content that isn't extracted content", { content: { type: "zip" } }],
    ["a workbook without sheets", { content: { ...CONTENT, sheets: [] } }],
    ["the file's name", { content: CONTENT, fileName: "extracto.xlsx" }],
    [
      "an account key that isn't an id",
      { content: CONTENT, account: "account:8901" },
    ],
    ["more than 4 digits", { content: CONTENT, account: "last4:12345" }],
  ])("refuses %s without queueing anything", async (_case, input) => {
    await expect(submitUntyped(input)).resolves.toEqual(INVALID_INPUT);
    expect(mocks.queueStatement).not.toHaveBeenCalled();
  });

  it.each([
    [`account:${ACCOUNT_ID}`, { accountId: ACCOUNT_ID }],
    ["last4:2109", { accountLast4: "2109" }],
  ])(
    "queues the session user's statement, with %s as the account it pins",
    async (key, account) => {
      const queued = { ok: true, value: { jobId: "job" } };
      mocks.queueStatement.mockResolvedValue(queued);

      await expect(
        submitUntyped({ content: CONTENT, account: key }),
      ).resolves.toEqual(queued);
      expect(mocks.queueStatement).toHaveBeenCalledWith("user_clerk", {
        content: CONTENT,
        account,
      });
    },
  );

  it("leaves the example once a statement is on its way, not before", async () => {
    mocks.queueStatement.mockResolvedValue({
      ok: false,
      error: { code: "LIMIT_REACHED" },
    });
    await submitStatement({ content: CONTENT });
    expect(mocks.endExample).not.toHaveBeenCalled();

    mocks.queueStatement.mockResolvedValue({
      ok: true,
      value: { jobId: "job" },
    });
    await submitStatement({ content: CONTENT });
    expect(mocks.endExample).toHaveBeenCalledOnce();
  });
});
