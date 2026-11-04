import "server-only";
import {
  compileUserRules,
  type MatchContext,
  matchedUpdate,
  type UserCategoryRule,
} from "@xtrakto/core";
import {
  listMatchCandidates,
  type MatchCandidates,
  saveMatches,
  type SavedMatch,
  type UserContext,
} from "@xtrakto/db";
import { matchMovements } from "@xtrakto/parsers";

/** What the rules know of the account, as ingestion read it. */
export type AccountRules = {
  readonly holderName?: string | undefined;
  readonly userRules: readonly UserCategoryRule[];
};

// Each verified quarterly statement's hidden movements, matched with its
// own that count.
const matchesOf = (
  { hidden, counted }: MatchCandidates,
  context: MatchContext,
): SavedMatch[] => {
  const statementIds = new Set(hidden.map((m) => m.coveredByStatementId));
  const hiddenById = new Map(hidden.map((m) => [m.id, m]));
  const countedById = new Map(counted.map((m) => [m.id, m]));
  return [...statementIds].flatMap((statementId) =>
    matchMovements(
      counted.filter((m) => m.statementId === statementId),
      hidden.filter((m) => m.coveredByStatementId === statementId),
    ).flatMap(({ exportedId, quarterlyId }) => {
      const hiddenMovement = hiddenById.get(exportedId);
      const countedMovement = countedById.get(quarterlyId);
      if (hiddenMovement === undefined || countedMovement === undefined)
        return [];
      const update = matchedUpdate(countedMovement, hiddenMovement, context);
      return [
        {
          hiddenId: exportedId,
          countedId: quarterlyId,
          ...(update === undefined ? {} : { update }),
        },
      ];
    }),
  );
};

/**
 * Matches an account's hidden movements, which a verified quarterly
 * statement holds on its days, with the statement's own that count (10.1a),
 * whichever was saved first and whenever: the one that counts takes the
 * reference only the movements export carries, with the category it
 * decides, and what the user answered for the hidden one alone. Run it in the
 * transaction that saved a statement. Returns how many it matched.
 */
export const matchAccountMovements = async (
  ctx: UserContext,
  accountId: string,
  { holderName, userRules }: AccountRules,
): Promise<number> => {
  const candidates = await listMatchCandidates(ctx, accountId);
  if (candidates.hidden.length === 0) return 0;
  const matches = matchesOf(candidates, {
    ...(holderName === undefined ? {} : { holderName }),
    userRules: compileUserRules(userRules),
  });
  await saveMatches(ctx, matches);
  return matches.length;
};
