import { APP_ERROR_CODE } from "@xtrakto/core";
import type { AppError, Result } from "@xtrakto/core";
import type { MappingChoices, MappingReview } from "@xtrakto/parsers";
import { NO_PROPOSAL } from "@/features/format-mappings/format-confirmation.constants";
import type { NoProposal } from "@/features/format-mappings/format-mapping.types";
import { NO_ANSWER, UPLOAD_STATUS } from "./upload.constants";
import type { ProposalError, UploadItem } from "./upload.types";

type ReviewedAction = {
  readonly type: "formatReviewed";
  readonly id: string;
  /** The correction it answers; the first review answers none. */
  readonly revision: number;
  readonly result: Result<MappingReview>;
  /** Why the LLM proposed nothing, when it didn't. */
  readonly noProposal?: NoProposal;
};

/** What settling the format of a file no parser knows does to it (11.3a, 11.3b). */
export type FormatAction =
  | { readonly type: "formatUnknown"; readonly id: string }
  | { readonly type: "formatProposing"; readonly id: string }
  | ReviewedAction
  | {
      readonly type: "formatCorrected";
      readonly id: string;
      readonly choices: MappingChoices;
      readonly revision: number;
    }
  | {
      readonly type: "formatFailed";
      readonly id: string;
      readonly error: AppError;
    }
  | { readonly type: "formatConfirmed"; readonly id: string };

type ConfirmingItem = Extract<
  UploadItem,
  { readonly status: typeof UPLOAD_STATUS.CONFIRMING }
>;

const { EXTRACTING, FINDING_FORMAT, PROPOSING, CONFIRMING, CONFIRMED, FAILED } =
  UPLOAD_STATUS;

/**
 * Why the LLM proposed no roles for a file, as its confirmation says it (11.3b):
 * the AI is off, a month's limit was reached, or it failed or never answered.
 * Undefined when the session ended, which leaves the file unread.
 */
export const noProposalOf = (
  answer: ProposalError | typeof NO_ANSWER,
): NoProposal | undefined => {
  if (answer === NO_ANSWER) return NO_PROPOSAL.AI_FAILED;
  if (answer.code === APP_ERROR_CODE.UNAUTHORIZED) return undefined;
  if (answer.code === "AI_OFF") return NO_PROPOSAL.AI_OFF;
  if (answer.code !== "AI_LIMIT_REACHED") return NO_PROPOSAL.AI_FAILED;
  return answer.limit === "USER_MONTH"
    ? NO_PROPOSAL.USER_MONTH
    : NO_PROPOSAL.PLATFORM_BUDGET;
};

// The first review opens the confirmation with the roles it read, and the
// formats its cells write. A worker that lost its file leaves it unread.
const confirming = (
  { id, file }: UploadItem,
  { result, noProposal }: ReviewedAction,
): UploadItem => {
  if (!result.ok) return { id, file, status: FAILED, error: result.error };
  const review = result.value;
  const confirmation = {
    review,
    choices: { roles: review.roles },
    revision: 0,
    isRereading: false,
    ...(noProposal === undefined ? {} : { noProposal }),
  };
  return { id, file, status: CONFIRMING, confirmation };
};

// A later review counts when it answers the latest correction.
const reviewed = (item: ConfirmingItem, action: ReviewedAction): UploadItem => {
  const { id, file, confirmation } = item;
  if (action.revision !== confirmation.revision) return item;
  if (!action.result.ok) {
    return { id, file, status: FAILED, error: action.result.error };
  }
  const review = action.result.value;
  return {
    ...item,
    confirmation: { ...confirmation, review, isRereading: false },
  };
};

/**
 * A file's next state as its format is settled: looked up once no parser
 * knows it, proposed when none is saved, waiting for the person with what
 * the proposal or only the date the code found make of it, read again with
 * each correction, then read with the mapping they confirmed. An action that
 * doesn't fit its state changes nothing.
 */
export const formatItem = (
  item: UploadItem,
  action: FormatAction,
): UploadItem => {
  const { id, file } = item;
  switch (action.type) {
    case "formatUnknown":
      return item.status === EXTRACTING
        ? { id, file, status: FINDING_FORMAT }
        : item;
    case "formatProposing":
      return item.status === FINDING_FORMAT
        ? { id, file, status: PROPOSING }
        : item;
    case "formatReviewed":
      if (item.status === PROPOSING) return confirming(item, action);
      return item.status === CONFIRMING ? reviewed(item, action) : item;
    case "formatCorrected": {
      if (item.status !== CONFIRMING) return item;
      const { choices, revision } = action;
      const corrected = { choices, revision, isRereading: true };
      return { ...item, confirmation: { ...item.confirmation, ...corrected } };
    }
    case "formatFailed":
      return item.status === PROPOSING
        ? { id, file, status: FAILED, error: action.error }
        : item;
    case "formatConfirmed":
      return item.status === CONFIRMING
        ? { id, file, status: CONFIRMED }
        : item;
  }
};
