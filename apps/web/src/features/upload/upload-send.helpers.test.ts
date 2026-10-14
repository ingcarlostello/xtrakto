import { APP_ERROR_CODE, PERIOD_SOURCE, periodSchema } from "@xtrakto/core";
import type { ExtractedContent } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { filesToSend } from "./upload-send.helpers";
import { UPLOAD_STATUS } from "./upload.constants";
import type {
  AccountKey,
  StatementPreview,
  UploadAccount,
  UploadItem,
} from "./upload.types";

const CONTENT: ExtractedContent = { type: "spreadsheet", sheets: [] };
const FILE = new File([], "extracto.xlsx");

const preview = (accountLast4?: string): StatementPreview => ({
  bankId: "bancolombia",
  formatId: accountLast4
    ? "bancolombia-savings-quarterly"
    : "bancolombia-movements-export",
  accountType: "savings",
  accountLast4,
  period: periodSchema.parse({ from: "2026-06-30", to: "2026-09-30" }),
  periodSource: accountLast4 ? PERIOD_SOURCE.STATEMENT : PERIOD_SOURCE.ROWS,
  movementCount: 33,
});

const ready = (
  id: string,
  last4?: string,
  accountKey?: AccountKey,
): UploadItem => ({
  id,
  file: FILE,
  status: UPLOAD_STATUS.READY,
  statement: { content: CONTENT, preview: preview(last4) },
  accountKey,
});

const ACCOUNT_8901: UploadAccount = {
  id: "a",
  bankId: "bancolombia",
  accountType: "savings",
  last4: "8901",
};

describe("filesToSend", () => {
  it("sends a quarterly statement with its content only: it names its own account", () => {
    expect(filesToSend([ready("q", "2109")], [ACCOUNT_8901])).toEqual([
      { id: "q", input: { content: CONTENT } },
    ]);
  });

  it("sends an export bound for the user's only account without a key", () => {
    expect(filesToSend([ready("e")], [ACCOUNT_8901])).toEqual([
      { id: "e", input: { content: CONTENT } },
    ]);
  });

  it("sends an export with the account the person chose", () => {
    const items = [ready("q", "2109"), ready("e", undefined, "last4:2109")];

    expect(filesToSend(items, [ACCOUNT_8901])).toEqual([
      { id: "q", input: { content: CONTENT } },
      { id: "e", input: { content: CONTENT, account: "last4:2109" } },
    ]);
  });

  it.each<[string, AccountKey | undefined]>([
    ["no choice yet", undefined],
    ["a choice its upload no longer offers", "last4:5555"],
  ])("leaves out an export that has to ask, with %s", (_case, chosen) => {
    const items = [ready("q", "2109"), ready("e", undefined, chosen)];

    expect(filesToSend(items, [ACCOUNT_8901]).map(({ id }) => id)).toEqual([
      "q",
    ]);
  });

  it("keeps asking once the quarterly statement that named the other account is sent", () => {
    const sent: UploadItem = {
      id: "q",
      file: FILE,
      status: UPLOAD_STATUS.SENT,
      preview: preview("2109"),
      jobId: "job",
    };

    expect(filesToSend([sent, ready("e")], [ACCOUNT_8901])).toEqual([]);
    expect(
      filesToSend([sent, ready("e", undefined, "account:a")], [ACCOUNT_8901]),
    ).toEqual([{ id: "e", input: { content: CONTENT, account: "account:a" } }]);
  });

  it("sends only the files read and not sent yet", () => {
    const items: UploadItem[] = [
      { id: "w", file: FILE, status: UPLOAD_STATUS.WAITING },
      {
        id: "f",
        file: FILE,
        status: UPLOAD_STATUS.FAILED,
        error: { code: APP_ERROR_CODE.UNKNOWN_FORMAT },
      },
      {
        id: "s",
        file: FILE,
        status: UPLOAD_STATUS.SENDING,
        statement: { content: CONTENT, preview: preview("2109") },
      },
      ready("r", "1234"),
    ];

    expect(filesToSend(items, []).map(({ id }) => id)).toEqual(["r"]);
  });
});
