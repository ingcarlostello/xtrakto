import "server-only";
import {
  type CachedLlmCategory,
  cacheLlmCategories,
  findCachedLlmCategories,
  listHolderNames,
  listLlmWaitingTexts,
  saveLlmCategories,
  toUserId,
  type UserId,
  withUserContext,
} from "@xtrakto/db";
import { userLedger } from "@/features/llm-usage/llm-usage.service";
import { type AiLedger, type AiModelId, generateStructured } from "@/lib/ai";
import { getDb } from "@/lib/db";
import { withSanitizedErrors } from "@/utils/sanitized-error.utils";
import { CATEGORIZE_BATCH_SIZE } from "./llm-categories.constants";
import {
  answersOf,
  batchesOf,
  cachedAnswersOf,
  categorizeInput,
  movementCategoriesOf,
  textGroupsOf,
  uncachedGroups,
} from "./llm-categories.helpers";
import type {
  CategorizedTexts,
  LlmCategoryAnswer,
  LlmRound,
  LlmTextGroup,
  TextToCategorize,
} from "./llm-categories.types";
import { CATEGORIZE_V1 } from "./prompts/categorize.v1";

export type CategorizeTextsCall = {
  /** Distinct texts, each redacted with its holder's names. */
  readonly texts: readonly TextToCategorize[];
  readonly ledger: AiLedger;
  /** lib/ai's models unless an eval asks one alone. */
  readonly models?: readonly AiModelId[];
};

/**
 * Asks the LLM the category of each text, in batches (8.4). The first
 * failure or limit stops the batches: the texts without an answer wait for
 * the next run (system design §1).
 */
export const categorizeTexts = async ({
  texts,
  ledger,
  models,
}: CategorizeTextsCall): Promise<CategorizedTexts> => {
  const answers = new Map<number, LlmCategoryAnswer>();
  for (const batch of batchesOf(texts, CATEGORIZE_BATCH_SIZE)) {
    const result = await generateStructured({
      prompt: CATEGORIZE_V1,
      input: categorizeInput(batch.items),
      ledger,
      models,
    });
    if (!result.ok) return { answers, stoppedBy: result.error };
    const { value, model } = result.value;
    for (const [index, answer] of answersOf(batch.items, value, model))
      answers.set(batch.start + index, answer);
  }
  return { answers };
};

// The cache's answers belong to the prompt's version that gave them.
const PROMPT = { name: CATEGORIZE_V1.name, version: CATEGORIZE_V1.version };

// The user's waiting texts as the LLM reads them, given the cache's answers
// on the way; those it has no answer for come back.
const answerFromCache = (userId: UserId) =>
  withUserContext(getDb(), userId, async (ctx) => {
    const groups = textGroupsOf(
      await listLlmWaitingTexts(ctx),
      await listHolderNames(ctx),
    );
    const cached = await findCachedLlmCategories(ctx, PROMPT, groups);
    return {
      categorized: await saveLlmCategories(
        ctx,
        movementCategoriesOf(groups, cached),
      ),
      unanswered: uncachedGroups(groups, cached),
    };
  });

// A batch's answers: kept for every user, and given to the user's movements.
const saveAnswers = (
  userId: UserId,
  batch: readonly LlmTextGroup[],
  answers: readonly CachedLlmCategory[],
) =>
  withUserContext(getDb(), userId, async (ctx) => {
    await cacheLlmCategories(ctx, PROMPT, answers);
    return saveLlmCategories(ctx, movementCategoriesOf(batch, answers));
  });

const roundFor = async (userId: UserId): Promise<LlmRound> => {
  const cached = await answerFromCache(userId);
  const batch = cached.unanswered.slice(0, CATEGORIZE_BATCH_SIZE);
  const round = { fromCache: cached.categorized, asked: batch.length };
  if (batch.length === 0)
    return { ...round, answered: 0, categorized: 0, hasMore: false };
  const { answers, stoppedBy } = await categorizeTexts({
    texts: batch.map(({ redactedText, direction }) => ({
      text: redactedText,
      direction,
    })),
    ledger: userLedger(userId),
  });
  const fresh = cachedAnswersOf(batch, answers);
  return {
    ...round,
    answered: fresh.length,
    categorized: await saveAnswers(userId, batch, fresh),
    hasMore: !stoppedBy && cached.unanswered.length > batch.length,
    ...(stoppedBy ? { stoppedBy: stoppedBy.code } : {}),
  };
};

/**
 * One round of the LLM's categories for the user's movements that no rule
 * names (8.5b): their texts, redacted with the user's holder names, take the
 * cache's answers first; then one batch of those it hasn't is sent within
 * the user's limits (8.3), its answers kept for every user and given, from
 * the confidence threshold, to every movement with their texts. A provider
 * failure or a limit ends it as a code, and the texts wait for the next
 * upload. Returns counts and codes only; errors are sanitized.
 */
export const categorizeWaitingMovements = (userId: string): Promise<LlmRound> =>
  withSanitizedErrors("MOVEMENTS_NOT_CATEGORIZED", () =>
    roundFor(toUserId(userId)),
  );
