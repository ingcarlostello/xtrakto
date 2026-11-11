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
} from "./mapping-proposal.helpers";
import type { ProposedRoles } from "./mapping-proposal.types";

export type ProposeRolesCall = {
  readonly sample: FormatSample;
  readonly ledger: AiLedger;
  /** lib/ai's models unless an eval asks one alone. */
  readonly models?: readonly AiModelId[];
};

/**
 * Asks the LLM the role of each column of a sample (11.2b): its names and
 * its cells' shapes, never a value (ADR 0038). Every failure comes back as
 * lib/ai's, and the person maps the columns themselves (11.3b).
 */
export const proposeColumnRoles = async ({
  sample,
  ledger,
  models,
}: ProposeRolesCall): Promise<Result<ProposedRoles, AiError>> => {
  const answer = await generateStructured({
    prompt: proposalPromptFor(sample.header.length),
    input: proposalInput(sample),
    ledger,
    models,
  });
  if (!answer.ok) return answer;
  const { value, model } = answer.value;
  return ok({ roles: value.roles, model });
};

/**
 * The roles the LLM proposes for the signed-in user's file of a format
 * Xtrakto doesn't know (11.2b), within their month's limits (8.3), its
 * names redacted with their holder names too. Their first proposal creates
 * their row, since their ledger keeps what it used. The Clerk id must come
 * from the session; unexpected errors are sanitized.
 */
export const proposeRolesFor = (
  clerkUserId: string,
  sample: FormatSample,
): Promise<Result<ProposedRoles, AiError>> =>
  withSanitizedErrors("MAPPING_NOT_PROPOSED", async () => {
    const db = getDb();
    const userId = await findOrCreateUser(db, clerkUserId);
    const holderNames = await withUserContext(db, userId, listHolderNames);
    return proposeColumnRoles({
      sample: redactedSample(sample, holderNames),
      ledger: userLedger(userId),
    });
  });
