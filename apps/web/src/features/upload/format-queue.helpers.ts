import { APP_ERROR_CODE } from "@xtrakto/core";
import type { AppError, Result } from "@xtrakto/core";
import { FORMAT_PROBLEM } from "./unknown-format.constants";
import { NO_ANSWER, UPLOAD_STATUS } from "./upload.constants";
import type { MappingProposal } from "@/features/format-mappings/format-mapping.types";
import type { ProposalError, UploadItem } from "./upload.types";

/** What settling the format of a file no parser knows does to it (11.3a). */
export type FormatAction =
  | { readonly type: "formatUnknown"; readonly id: string }
  | { readonly type: "formatProposing"; readonly id: string }
  | {
      readonly type: "formatProposed";
      readonly id: string;
      readonly result: Result<MappingProposal>;
    }
  | {
      readonly type: "formatFailed";
      readonly id: string;
      readonly error: AppError;
    }
  | { readonly type: "formatConfirmed"; readonly id: string };

const { EXTRACTING, FINDING_FORMAT, PROPOSING, CONFIRMING, CONFIRMED, FAILED } =
  UPLOAD_STATUS;

const problem = (
  reason: (typeof FORMAT_PROBLEM)[keyof typeof FORMAT_PROBLEM],
): AppError => ({ code: APP_ERROR_CODE.UNKNOWN_FORMAT, details: { reason } });

/**
 * Why the LLM proposed no roles for a file, as its row says it: the session
 * ended, the AI is off, a month's limit was reached, or it failed or never
 * answered.
 */
export const proposalProblem = (
  answer: ProposalError | typeof NO_ANSWER,
): AppError => {
  if (answer === NO_ANSWER) return problem(FORMAT_PROBLEM.AI_FAILED);
  if (answer.code === APP_ERROR_CODE.UNAUTHORIZED) return { code: answer.code };
  if (answer.code === "AI_OFF") return problem(FORMAT_PROBLEM.AI_OFF);
  if (answer.code !== "AI_LIMIT_REACHED")
    return problem(FORMAT_PROBLEM.AI_FAILED);
  return problem(
    answer.limit === "USER_MONTH"
      ? FORMAT_PROBLEM.USER_MONTH
      : FORMAT_PROBLEM.PLATFORM_BUDGET,
  );
};

// Roles that read no table, or a mapping that doesn't read the file, leave
// it unread.
const proposed = (
  { id, file }: UploadItem,
  result: Result<MappingProposal>,
): UploadItem =>
  result.ok
    ? { id, file, status: CONFIRMING, proposal: result.value }
    : { id, file, status: FAILED, error: problem(FORMAT_PROBLEM.NOT_READ) };

/**
 * A file's next state as its format is settled: looked up once no parser
 * knows it, proposed when none is saved, waiting for the person with what
 * the proposal makes of it, then read with the mapping they confirmed. An
 * action that doesn't fit its state changes nothing.
 */
export const formatItem = (
  item: UploadItem,
  action: FormatAction,
): UploadItem => {
  const { id, file, status } = item;
  switch (action.type) {
    case "formatUnknown":
      return status === EXTRACTING
        ? { id, file, status: FINDING_FORMAT }
        : item;
    case "formatProposing":
      return status === FINDING_FORMAT ? { id, file, status: PROPOSING } : item;
    case "formatProposed":
      return status === PROPOSING ? proposed(item, action.result) : item;
    case "formatFailed":
      return status === PROPOSING
        ? { id, file, status: FAILED, error: action.error }
        : item;
    case "formatConfirmed":
      return status === CONFIRMING ? { id, file, status: CONFIRMED } : item;
  }
};
