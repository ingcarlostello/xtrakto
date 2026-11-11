import { APP_ERROR_CODE, err, ok } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import type { MappingProposal } from "@/features/format-mappings/format-mapping.types";
import { formatItem, proposalProblem } from "./format-queue.helpers";
import { FORMAT_PROBLEM } from "./unknown-format.constants";
import { NO_ANSWER, UPLOAD_STATUS } from "./upload.constants";
import type { ProposalError, UploadItem } from "./upload.types";

const FILE = new File([], "otro-banco.xlsx");
const PROPOSAL = { mapping: {}, review: {} } as unknown as MappingProposal;

const item = (state: Record<string, unknown>): UploadItem =>
  // Safe: each test passes a state of the union.
  ({ id: "a", file: FILE, ...state }) as UploadItem;

const problem = (reason: string) => ({
  code: APP_ERROR_CODE.UNKNOWN_FORMAT,
  details: { reason },
});

describe("formatItem", () => {
  it("settles a file's format in order: unknown, proposing, confirming, confirmed", () => {
    const extracting = item({
      status: UPLOAD_STATUS.EXTRACTING,
      stage: "recognizing",
    });
    const finding = formatItem(extracting, { type: "formatUnknown", id: "a" });
    const proposing = formatItem(finding, { type: "formatProposing", id: "a" });
    const confirming = formatItem(proposing, {
      type: "formatProposed",
      id: "a",
      result: ok(PROPOSAL),
    });

    expect(
      [finding, proposing, confirming].map(({ status }) => status),
    ).toEqual([
      UPLOAD_STATUS.FINDING_FORMAT,
      UPLOAD_STATUS.PROPOSING,
      UPLOAD_STATUS.CONFIRMING,
    ]);
    expect(confirming).toMatchObject({ proposal: PROPOSAL });
    expect(
      formatItem(confirming, { type: "formatConfirmed", id: "a" }).status,
    ).toBe(UPLOAD_STATUS.CONFIRMED);
  });

  it("leaves unread a file whose proposal reads no table, whatever the worker said", () => {
    const proposing = item({ status: UPLOAD_STATUS.PROPOSING });

    expect(
      formatItem(proposing, {
        type: "formatProposed",
        id: "a",
        result: err({ code: APP_ERROR_CODE.PARSE_FAILED }),
      }),
    ).toMatchObject({
      status: UPLOAD_STATUS.FAILED,
      error: problem(FORMAT_PROBLEM.NOT_READ),
    });
  });

  it.each([
    { type: "formatUnknown", from: UPLOAD_STATUS.WAITING },
    { type: "formatProposing", from: UPLOAD_STATUS.EXTRACTING },
    { type: "formatProposed", from: UPLOAD_STATUS.FINDING_FORMAT },
    { type: "formatFailed", from: UPLOAD_STATUS.CONFIRMING },
    { type: "formatConfirmed", from: UPLOAD_STATUS.PROPOSING },
  ] as const)("changes nothing on $type from $from", ({ type, from }) => {
    const before = item({ status: from, stage: "reading" });
    const action =
      type === "formatProposed"
        ? { type, id: "a", result: ok(PROPOSAL) }
        : type === "formatFailed"
          ? { type, id: "a", error: problem(FORMAT_PROBLEM.AI_OFF) }
          : { type, id: "a" };

    expect(formatItem(before, action)).toBe(before);
  });
});

describe("proposalProblem", () => {
  it.each<{ answer: ProposalError | typeof NO_ANSWER; reason: string }>([
    { answer: { code: "AI_OFF" }, reason: FORMAT_PROBLEM.AI_OFF },
    {
      answer: { code: "AI_LIMIT_REACHED", limit: "USER_MONTH" },
      reason: FORMAT_PROBLEM.USER_MONTH,
    },
    {
      answer: { code: "AI_LIMIT_REACHED", limit: "PLATFORM_BUDGET" },
      reason: FORMAT_PROBLEM.PLATFORM_BUDGET,
    },
    { answer: { code: "AI_FAILED" }, reason: FORMAT_PROBLEM.AI_FAILED },
    { answer: { code: "INVALID_INPUT" }, reason: FORMAT_PROBLEM.AI_FAILED },
    { answer: NO_ANSWER, reason: FORMAT_PROBLEM.AI_FAILED },
  ])("says $reason for $answer", ({ answer, reason }) => {
    expect(proposalProblem(answer)).toEqual(problem(reason));
  });

  it("says the session ended as it is", () => {
    expect(proposalProblem({ code: APP_ERROR_CODE.UNAUTHORIZED })).toEqual({
      code: APP_ERROR_CODE.UNAUTHORIZED,
    });
  });
});
