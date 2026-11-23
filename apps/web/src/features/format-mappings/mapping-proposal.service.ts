import "server-only";
import { type FormatSample, ok, type Result } from "@xtrakto/core";
import {
  findOrCreateUser,
  listHolderNames,
  withUserContext,
} from "@xtrakto/db";
import { userLedger } from "@/features/llm-usage/llm-usage.service";
import {
  type AiError,
  type AiLedger,
  type AiModelId,
  generateStructured,
} from "@/lib/ai";
import { getDb } from "@/lib/db";
import { withSanitizedErrors } from "@/utils/sanitized-error.utils";
import {
  proposalInput,
  proposalPromptFor,
  redactedSample,
  retryInput,
  retryPromptFor,
} from "./mapping-proposal.helpers";
import type { ProposedRoles } from "./mapping-proposal.types";
import type { MappingRetry } from "./mapping-retry.schemas";

// The second proposal asks the stronger model alone (11.4).
const RETRY_MODELS: readonly AiModelId[] = ["deepseek-v4-pro"];

export type ProposeRolesCall = {
  readonly sample: FormatSample;
  readonly ledger: AiLedger;
  /** lib/ai's models, or the stronger one for a retry, unless an eval asks one alone. */
  readonly models?: readonly AiModelId[];
  /** For a second proposal: the roles before and what failed (11.4). */
  readonly retry?: MappingRetry;
};

/**
 * Asks the LLM the role of each column of a sample (11.2b): its names and
 * its cells' shapes, never a value (ADR 0038); a second time, also the roles
 * it gave and what failed, in codes (11.4). Every failure comes back as
 * lib/ai's, and the person maps the columns themselves (11.3b).
 */
export const proposeColumnRoles = async ({
  sample,
  ledger,
  models,
  retry,
}: ProposeRolesCall): Promise<Result<ProposedRoles, AiError>> => {
  const columns = sample.header.length;
  const answer = await generateStructured(
    retry === undefined
      ? {
          prompt: proposalPromptFor(columns),
          input: proposalInput(sample),
          ledger,
          models,
        }
      : {
          prompt: retryPromptFor(columns),
          input: retryInput(sample, retry),
          ledger,
          models: models ?? RETRY_MODELS,
        },
  );
  if (!answer.ok) return answer;
  const { value, model } = answer.value;
  return ok({ roles: value.roles, model });
};

/**
 * The roles the LLM proposes for the signed-in user's file of a format
 * Xtrakto doesn't know (11.2b), or proposes again told what failed (11.4),
 * within their month's limits (8.3), its names redacted with their holder
 * names too. Their first proposal creates their row, since their ledger
 * keeps what it used. The Clerk id must come from the session; unexpected
 * errors are sanitized.
 */
export const proposeRolesFor = (
  clerkUserId: string,
  sample: FormatSample,
  retry?: MappingRetry,
): Promise<Result<ProposedRoles, AiError>> =>
  withSanitizedErrors("MAPPING_NOT_PROPOSED", async () => {
    const db = getDb();
    const userId = await findOrCreateUser(db, clerkUserId);
    const holderNames = await withUserContext(db, userId, listHolderNames);
    return proposeColumnRoles({
      sample: redactedSample(sample, holderNames),
      ledger: userLedger(userId),
      ...(retry === undefined ? {} : { retry }),
    });
  });
