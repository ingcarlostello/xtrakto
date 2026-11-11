import { APP_ERROR_CODE, COLUMN_ROLE, err, ok } from "@xtrakto/core";
import type { ColumnRole, Result } from "@xtrakto/core";
import type { MappingReview } from "@xtrakto/parsers";
import { describe, expect, it } from "vitest";
import { NO_PROPOSAL } from "@/features/format-mappings/format-confirmation.constants";
import type { NoProposal } from "@/features/format-mappings/format-mapping.types";
import { formatItem, noProposalOf } from "./format-queue.helpers";
import type { FormatAction } from "./format-queue.helpers";
import { NO_ANSWER, UPLOAD_STATUS } from "./upload.constants";
import type { ProposalError, UploadItem } from "./upload.types";

const FILE = new File([], "otro-banco.xlsx");
const { DATE, DESCRIPTION, AMOUNT, NONE } = COLUMN_ROLE;

// Safe: the queue keeps a review as the worker gave it, reading its roles only.
const reviewOf = (roles: readonly ColumnRole[]) =>
  ({ roles }) as unknown as MappingReview;

const REVIEW = reviewOf([DATE, DESCRIPTION, AMOUNT]);
const UNREADABLE = err({ code: APP_ERROR_CODE.PARSE_FAILED });

const item = (state: Record<string, unknown>): UploadItem =>
  // Safe: each test passes a state of the union.
  ({ id: "a", file: FILE, ...state }) as UploadItem;

const reviewed = (
  revision: number,
  result: Result<MappingReview> = ok(REVIEW),
  noProposal?: NoProposal,
): FormatAction => ({
  type: "formatReviewed",
  id: "a",
  revision,
  result,
  ...(noProposal === undefined ? {} : { noProposal }),
});

const confirmingItem = () =>
  formatItem(item({ status: UPLOAD_STATUS.PROPOSING }), reviewed(0));

describe("formatItem", () => {
  it("settles a file's format in order: unknown, proposing, confirming, confirmed", () => {
    const extracting = item({
      status: UPLOAD_STATUS.EXTRACTING,
      stage: "recognizing",
    });
    const finding = formatItem(extracting, { type: "formatUnknown", id: "a" });
    const proposing = formatItem(finding, { type: "formatProposing", id: "a" });
    const confirming = formatItem(proposing, reviewed(0));

    expect(
      [finding, proposing, confirming].map(({ status }) => status),
    ).toEqual([
      UPLOAD_STATUS.FINDING_FORMAT,
      UPLOAD_STATUS.PROPOSING,
      UPLOAD_STATUS.CONFIRMING,
    ]);
    expect(confirming).toEqual({
      id: "a",
      file: FILE,
      status: UPLOAD_STATUS.CONFIRMING,
      confirmation: {
        review: REVIEW,
        choices: { roles: REVIEW.roles },
        revision: 0,
        isRereading: false,
      },
    });
    expect(
      formatItem(confirming, { type: "formatConfirmed", id: "a" }).status,
    ).toBe(UPLOAD_STATUS.CONFIRMED);
  });

  it("opens the confirmation without a proposal, saying why", () => {
    const proposing = item({ status: UPLOAD_STATUS.PROPOSING });
    const action = reviewed(0, ok(REVIEW), NO_PROPOSAL.AI_OFF);

    expect(formatItem(proposing, action)).toMatchObject({
      status: UPLOAD_STATUS.CONFIRMING,
      confirmation: { noProposal: NO_PROPOSAL.AI_OFF },
    });
  });

  it("reads a file again with each correction, keeping only the review of the latest", () => {
    const choices = { roles: [DATE, NONE, AMOUNT], dateOrder: "mdy" } as const;
    const corrected = formatItem(confirmingItem(), {
      type: "formatCorrected",
      id: "a",
      choices,
      revision: 2,
    });
    const answer = reviewOf(choices.roles);

    expect(corrected).toMatchObject({
      confirmation: { review: REVIEW, choices, revision: 2, isRereading: true },
    });
    expect(formatItem(corrected, reviewed(1, ok(answer)))).toBe(corrected);
    expect(formatItem(corrected, reviewed(2, ok(answer)))).toMatchObject({
      status: UPLOAD_STATUS.CONFIRMING,
      confirmation: { review: answer, choices, isRereading: false },
    });
  });

  it("leaves unread a file its worker can no longer read", () => {
    const proposing = item({ status: UPLOAD_STATUS.PROPOSING });
    const failed = {
      status: UPLOAD_STATUS.FAILED,
      error: { code: APP_ERROR_CODE.PARSE_FAILED },
    };

    expect(formatItem(proposing, reviewed(0, UNREADABLE))).toMatchObject(
      failed,
    );
    expect(formatItem(confirmingItem(), reviewed(0, UNREADABLE))).toMatchObject(
      failed,
    );
  });

  it("fails a file whose proposal the session's end stopped", () => {
    const error = { code: APP_ERROR_CODE.UNAUTHORIZED };

    expect(
      formatItem(item({ status: UPLOAD_STATUS.PROPOSING }), {
        type: "formatFailed",
        id: "a",
        error,
      }),
    ).toMatchObject({ status: UPLOAD_STATUS.FAILED, error });
  });

  it.each([
    { type: "formatUnknown", from: UPLOAD_STATUS.WAITING },
    { type: "formatProposing", from: UPLOAD_STATUS.EXTRACTING },
    { type: "formatReviewed", from: UPLOAD_STATUS.FINDING_FORMAT },
    { type: "formatCorrected", from: UPLOAD_STATUS.PROPOSING },
    { type: "formatFailed", from: UPLOAD_STATUS.CONFIRMING },
    { type: "formatConfirmed", from: UPLOAD_STATUS.PROPOSING },
  ] as const)("changes nothing on $type from $from", ({ type, from }) => {
    const before = item({ status: from, stage: "reading" });
    const actions: Record<typeof type, FormatAction> = {
      formatUnknown: { type: "formatUnknown", id: "a" },
      formatProposing: { type: "formatProposing", id: "a" },
      formatReviewed: reviewed(0),
      formatCorrected: {
        type: "formatCorrected",
        id: "a",
        choices: { roles: [DATE] },
        revision: 1,
      },
      formatFailed: {
        type: "formatFailed",
        id: "a",
        error: { code: APP_ERROR_CODE.UNAUTHORIZED },
      },
      formatConfirmed: { type: "formatConfirmed", id: "a" },
    };

    expect(formatItem(before, actions[type])).toBe(before);
  });
});

describe("noProposalOf", () => {
  it.each<{ answer: ProposalError | typeof NO_ANSWER; reason: NoProposal }>([
    { answer: { code: "AI_OFF" }, reason: NO_PROPOSAL.AI_OFF },
    {
      answer: { code: "AI_LIMIT_REACHED", limit: "USER_MONTH" },
      reason: NO_PROPOSAL.USER_MONTH,
    },
    {
      answer: { code: "AI_LIMIT_REACHED", limit: "PLATFORM_BUDGET" },
      reason: NO_PROPOSAL.PLATFORM_BUDGET,
    },
    { answer: { code: "AI_FAILED" }, reason: NO_PROPOSAL.AI_FAILED },
    { answer: { code: "INVALID_INPUT" }, reason: NO_PROPOSAL.AI_FAILED },
    { answer: NO_ANSWER, reason: NO_PROPOSAL.AI_FAILED },
  ])("says $reason for $answer", ({ answer, reason }) => {
    expect(noProposalOf(answer)).toBe(reason);
  });

  it("says nothing once the session ended, which leaves the file unread", () => {
    expect(noProposalOf({ code: APP_ERROR_CODE.UNAUTHORIZED })).toBeUndefined();
  });
});
